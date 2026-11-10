import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * Sell My Company Data (sellmycompanydata.com): an indicative range for what
 * a company's operational records could be worth when licensed for AI
 * training and evaluation, worked out from summary figures only.
 *
 * MCP. Both endpoints call the public MCP server at
 * `https://sellmycompanydata.com/mcp` (Streamable HTTP, stateless: no
 * session, no `initialize`, JSON responses, no SSE). Each endpoint pins one
 * `tools/call` name in its own `input.toRequest`. Callers pass only that
 * tool's arguments, so a caller cannot reach another tool on the server.
 * The server's third tool, `request_offer`, is deliberately NOT ported: it
 * submits the owner's contact details to a human team and sends email and
 * Slack notifications. The server's one prompt is not ported either.
 *
 * KEYLESS. The server takes no credential, so the provider declares an
 * EMPTY credential shape and an identity `auth.inject`: the compiler needs
 * `inject` to resolve, the injector validates `{}` against `{}`, and the
 * request egresses exactly as built.
 *
 * FREE. Calls carry no charge, so usage is the FREE model alone: the
 * quantities fns are compiler-synthesized and there is no meter.
 *
 * ENVELOPE. Streamable HTTP answers failures with HTTP 200: a JSON-RPC
 * `error`, or a tool result with `isError: true` (the server's own input
 * checks, for example a founding year in the future). `lifecycle.start`
 * lifts those, and any malformed success envelope, to a synthesized 422 so
 * they settle as provider errors at zero; `output.fromError` digests them
 * to `{ message, code?, raw }`. A success returns
 * `result.structuredContent`.
 */
export default defineProvider({
    name: "sellmycompanydata",
    meta: {
        displayName: "Sell My Company Data",
        summary: "Estimate what a company's data could be worth if licensed " +
            "for AI training. Read-only, no key.",
        description: "Sell My Company Data works out an indicative range for " +
            "what a company's operational records (chat, CRM, support " +
            "tickets, docs, code, email, projects, finance) could be worth " +
            "when licensed for AI training and evaluation. These endpoints " +
            "call its public MCP server, and no key is needed. Start with " +
            "`sellmycompanydata#assessment-checklist` to learn what to " +
            "count, then call `sellmycompanydata#estimate-data-value` with " +
            "headcount, founding year, region and the list of systems. The " +
            "estimate comes back with caveats, what would raise it, and " +
            "`estimate_url`, a link to the website calculator with the same " +
            "figures filled in. Inputs are counts and date ranges only, " +
            "never content or personal data. The range is indicative: it is " +
            "not a valuation or an offer, and a buyer prices data only after " +
            "reviewing it. Read-only: this connector does not submit " +
            "enquiries or contact anyone.",
        homepageUrl: "https://sellmycompanydata.com",
        docsUrl: "https://sellmycompanydata.com/connector/",
        categories: ["funding-data"],
        notes: [
            "Stateless MCP over HTTPS: POST https://sellmycompanydata.com/mcp " +
            "(Streamable HTTP, JSON responses, no session). Each endpoint " +
            "pins one tools/call name; callers pass only that tool's " +
            "arguments.",
            "Send counts, date ranges and product names only. Never send " +
            "message text, file contents, customer names or other personal " +
            "data.",
            "Sell My Company Data records pseudonymous usage events for each " +
            "call, including bucketed inputs and the returned range: " +
            "https://sellmycompanydata.com/privacy/#connector",
            "The server's own input checks (for example a founding year in " +
            "the future) answer inside an HTTP 200. They settle here as a " +
            "provider error whose `message` is the server's explanation.",
            "The server's third tool, request_offer, is not included: it " +
            "submits the owner's contact details to a human team. " +
            "`estimate_url` opens the website calculator with the same " +
            "figures, and a review or offers can be requested there.",
        ],
    },
    request: {
        baseUrl: "https://sellmycompanydata.com",
        headers: {
            accept: "application/json, text/event-stream",
            "mcp-protocol-version": "2025-11-25",
        },
    },
    auth: {
        // keyless: the empty shape validates `{}` and the identity inject
        // returns the request untouched
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    // observed under 0.4 s per call (2026-10-29); headroom for a cold
    // worker
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        /**
         * Streamable HTTP returns JSON-RPC and tool failures with HTTP 200.
         * Lift every in-band failure, and any envelope that is not a
         * well-formed success for THIS request, to a provider error so a
         * failure never reads as a result.
         */
        start: async ({ data, utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const requestId = utils.json.optionalGet(
                data.input.body ?? null,
                "$.id",
            );
            const responseId = utils.json.optionalGet(res.body, "$.id");
            const jsonrpc = utils.json.optionalGet(res.body, "$.jsonrpc");
            const error = utils.json.optionalGet(res.body, "$.error");
            const result = utils.json.optionalGet(res.body, "$.result");
            const isError = utils.json.optionalGet(
                res.body,
                "$.result.isError",
            );
            const structured = utils.json.optionalGet(
                res.body,
                "$.result.structuredContent",
            );
            const malformed = jsonrpc !== "2.0" || responseId !== requestId ||
                result === null || typeof result !== "object" ||
                Array.isArray(result) ||
                (isError !== undefined && typeof isError !== "boolean") ||
                structured === null || typeof structured !== "object" ||
                Array.isArray(structured);
            if (error !== undefined || isError === true || malformed) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 422,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.get(data.output, "$.result.structuredContent"),
        // digest, never hide: the server's own reason first, the raw body
        // always under `raw`
        fromError: ({ data, utils }) => {
            // the tool's text is its reason only on a refusal; on a
            // malformed success it is the answer, so it is not reused
            const isError = utils.json.optionalGet(
                data.output,
                "$.result.isError",
            );
            const toolText = isError === true
                ? utils.json.optionalGet(
                    data.output,
                    "$.result.content[0].text",
                )
                : undefined;
            const rpcMessage = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const rpcCode = utils.json.optionalGet(data.output, "$.error.code");
            const plain = utils.json.optionalGet(data.output, "$.error");
            const message = typeof toolText === "string" && toolText !== ""
                ? toolText
                : typeof rpcMessage === "string" && rpcMessage !== ""
                ? rpcMessage
                : typeof plain === "string" && plain !== ""
                ? plain
                : "Sell My Company Data returned an unexpected response";
            return {
                message,
                ...(typeof rpcCode === "number" ? { code: rpcCode } : {}),
                raw: data.output,
            };
        },
    },
});
