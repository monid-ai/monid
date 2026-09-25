import { defineProvider } from "@shared/core";
import { z } from "zod";
import { DIMHOUR_CREDITS, DIMHOUR_USAGE_MODEL } from "./rate-card.ts";

/**
 * Dim Hour — a verified restaurant, bar and venue catalog across 24 North
 * American cities, read through its public, stateless Streamable HTTP MCP
 * server (https://dimhour.com/mcp.html).
 *
 * ONE PHYSICAL ROUTE, NINE LOGICAL ENDPOINTS. Every endpoint sends
 * `POST https://mcp.dimhour.com/mcp` with a JSON-RPC 2.0 `tools/call`
 * envelope. Each endpoint declares its own stable public identity
 * (`endpoint: "/search-venues"`, …) because the native path is shared
 * transport plumbing (design D22, the contactout posture), and its own
 * `input.toRequest` that wraps the validated caller input as
 * `params.arguments` under a FIXED tool name. Nothing here is a Dim Hour
 * special case in the engine: the mapping is ordinary connector hooks.
 *
 * WHY THE PROVIDER OWNS A lifecycle.start (design D2, the hunterio
 * email-verifier posture): an MCP server reports failure INSIDE an HTTP
 * 200 — a JSON-RPC top-level `error` (-32601 method not found) or a tool
 * result with `isError: true` (bad arguments, unknown city, an unknown
 * tool). The declarative path would settle both as billable success. The
 * start fn makes the endpoint's own single request through
 * `utils.request()` (no extra IO, no extra target) and only CLASSIFIES
 * it: an in-body failure, or a 200 carrying no JSON the caller can use,
 * settles as a 502 provider error (providerHttpStatus keeps the real 200),
 * which the engine zero-bills. It never returns RUNNING: every Dim Hour
 * call is one synchronous exchange, so no poll exists.
 *
 * OUTPUT: `result.structuredContent` is the payload; the MCP envelope is
 * dropped. When a server omits it, `result.content[0].text` is the same
 * payload serialized as JSON and is parsed instead. Text that is not JSON
 * never reaches fromResponse: start has already settled it as an error.
 *
 * AUTH: none for reads. An OPTIONAL key (Dim Hour's free key lifts the
 * anonymous daily cap) travels as `x-api-key` when one is configured;
 * with no key the request goes out bare and still succeeds.
 */
export default defineProvider({
    name: "dimhour",
    meta: {
        displayName: "Dim Hour",
        summary: "Verified restaurant, bar and venue catalog across 24 " +
            "North American cities.",
        description: "Dim Hour is a verified catalog of about 21,000 " +
            "restaurants, bars and venues across 24 North American cities. " +
            "Search by cuisine, dish, neighborhood, price or award; plan " +
            "for an occasion; and read one venue's full record: address, " +
            "hours, phone, happy hour, the booking path that takes " +
            "reservations, awards, website and Instagram. Every venue " +
            "carries a dimhour.com link to cite. Read-only: no account, " +
            "profile or write tools are exposed.",
        homepageUrl: "https://dimhour.com",
        docsUrl: "https://dimhour.com/mcp.html",
        categories: ["maps"],
        notes: [
            "Every endpoint is one MCP tools/call against POST " +
            "https://mcp.dimhour.com/mcp. A failure the server reports " +
            "inside an HTTP 200 (a JSON-RPC error, or a tool result with " +
            "isError) settles as a 502 provider error with zero usage; " +
            "the server's own message is in the output.",
            "Anonymous reads are capped at 1,000 calls a day (10,000 with " +
            "a free Dim Hour key) plus a per-minute cap, and a search " +
            "returns at most 25 venues. Dim Hour's terms prohibit bulk " +
            "extraction and redistribution of the catalog.",
            "Catalog values are catalog data, not a live feed: confirm " +
            "hours and bookings with the venue before relying on them.",
        ],
    },
    auth: {
        /** Reads need no credential; the key is OPTIONAL (design D16:
         *  injected at egress, never seen by other fns). */
        credentials: z.object({ apiKey: z.string().min(1).optional() }),
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                ...(typeof data.params.apiKey === "string" &&
                        data.params.apiKey !== ""
                    ? { "x-api-key": data.params.apiKey }
                    : {}),
            },
        }),
    },
    request: {
        baseUrl: "https://mcp.dimhour.com",
        headers: {
            "content-type": "application/json",
            "accept": "application/json, text/event-stream",
        },
    },
    // measured live 2026-09-24: 0.1-2.1 s per call across all nine tools
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const env = typeof res.body === "object" && res.body !== null &&
                    !Array.isArray(res.body)
                ? res.body as { error?: unknown; result?: unknown }
                : undefined;
            const result = env !== undefined &&
                    typeof env.result === "object" && env.result !== null &&
                    !Array.isArray(env.result)
                ? env.result as {
                    isError?: unknown;
                    structuredContent?: unknown;
                    content?: unknown;
                }
                : undefined;
            let usable = false;
            if (
                env !== undefined && env.error === undefined &&
                result !== undefined && result.isError !== true
            ) {
                const sc = result.structuredContent;
                if (typeof sc === "object" && sc !== null) {
                    usable = true;
                } else if (
                    Array.isArray(result.content) &&
                    result.content.length > 0
                ) {
                    const first = result.content[0] as { text?: unknown };
                    if (
                        typeof first === "object" && first !== null &&
                        typeof first.text === "string"
                    ) {
                        try {
                            const parsed = JSON.parse(first.text);
                            usable = typeof parsed === "object" &&
                                parsed !== null;
                        } catch (_) {
                            usable = false;
                        }
                    }
                }
            }
            return usable
                ? {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                }
                : {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
        },
    },
    usage: {
        /** The rate card is an OPEN ITEM — see ./rate-card.ts. */
        credits: DIMHOUR_CREDITS,
        model: DIMHOUR_USAGE_MODEL,
    },
    output: {
        /** Unwrap the MCP envelope: `result.structuredContent`, else the
         *  JSON in `result.content[0].text`. start only lets a response
         *  through when one of the two is usable JSON. */
        fromResponse: ({ data }) => {
            const env = data.output as {
                result?: { structuredContent?: unknown; content?: unknown };
            };
            const result = env.result ?? {};
            const sc = result.structuredContent;
            if (typeof sc === "object" && sc !== null) {
                return sc as { [key: string]: never };
            }
            const content = Array.isArray(result.content) ? result.content : [];
            const first = content.length > 0
                ? content[0] as { text?: unknown }
                : undefined;
            if (first !== undefined && typeof first.text === "string") {
                try {
                    return JSON.parse(first.text);
                } catch (_) {
                    return { raw: data.output };
                }
            }
            return { raw: data.output };
        },
        /** Provider errors → `{message, error_code?, raw}` (design D12):
         *  the JSON-RPC error message, else the tool's own error text
         *  (Dim Hour sends `{"error": "..."}` as JSON text), else a plain
         *  statement of what was missing. The raw body always rides along. */
        fromError: ({ data }) => {
            const body = data.output;
            const env = typeof body === "object" && body !== null &&
                    !Array.isArray(body)
                ? body as {
                    error?: { code?: unknown; message?: unknown };
                    result?: { isError?: unknown; content?: unknown };
                }
                : undefined;
            const rpc = env?.error;
            if (typeof rpc === "object" && rpc !== null) {
                return {
                    message: typeof rpc.message === "string"
                        ? rpc.message
                        : "Dim Hour MCP protocol error",
                    ...(typeof rpc.code === "number"
                        ? { error_code: rpc.code }
                        : {}),
                    raw: body,
                };
            }
            const content = env?.result?.content;
            const first = Array.isArray(content) && content.length > 0
                ? content[0] as { text?: unknown }
                : undefined;
            const text = typeof first === "object" && first !== null &&
                    typeof first.text === "string"
                ? first.text
                : undefined;
            if (env?.result?.isError === true) {
                let message = text ?? "Dim Hour tool error";
                try {
                    const parsed = JSON.parse(message);
                    if (
                        typeof parsed === "object" && parsed !== null &&
                        typeof parsed.error === "string"
                    ) {
                        message = parsed.error;
                    }
                } catch (_) {
                    // plain-text tool error: keep it as the message
                }
                return { message, raw: body };
            }
            if (env?.result !== undefined) {
                return {
                    message: "Dim Hour answered without structured JSON " +
                        "content",
                    raw: body,
                };
            }
            return { message: "Dim Hour MCP request failed", raw: body };
        },
    },
});
