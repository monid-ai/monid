import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * Loyaltie (loyaltie.com) — a US marketplace for people and their agents:
 * the everyday things people buy again and again (coffee and tea, pantry,
 * snacks, drinks, skin and body care, home care, pet food) straight from
 * independent US brands, in one cart, with regular delivery.
 *
 * Wire: Loyaltie's public MCP server (`POST https://loyaltie.com/api/ucp/mcp`,
 * streamable HTTP, stateless, plain `application/json` responses). Every
 * endpoint is one `tools/call`; `input.toRequest` wraps the caller's
 * arguments in the JSON-RPC envelope and `output.fromResponse` returns the
 * tool's `structuredContent` (UCP-shaped). No session and no sign-in.
 *
 * Auth: the server is public, so there is no secret. `credentials` is the
 * empty shape and `inject` passes the request through unchanged.
 *
 * Billing: FREE. Loyaltie charges nothing per call; the person pays for the
 * products on loyaltie.com, never through Monid.
 *
 * Attribution: every call sends `src: "api"` and `agent_id: "monid"`, so the
 * loyaltie.com links in the output carry `?src=api&agent=monid`.
 */
export default defineProvider({
    name: "loyaltie",
    meta: {
        displayName: "Loyaltie",
        summary:
            "Day-to-day shopping: everyday products from independent US brands, one cart, regular delivery.",
        description: "Search and buy the everyday things people buy again " +
            "and again (coffee and tea, pantry, snacks, drinks, skin and " +
            "body care, home care, pet food) straight from independent US " +
            "brands, all in one cart. Search the catalog with filters for " +
            "price, the brand's US state and regular delivery; read full " +
            "product and brand details (price, photos, ratings, " +
            "ingredients, where it ships from); then build a loyaltie.com " +
            "cart link the person opens to review and pay with their " +
            "email, shipping address and payment, no separate sign-up. The " +
            "agent never pays and no account is needed to search or build " +
            "a cart. Loyaltie runs the order and the support and stands " +
            "behind it. Prices are in cents. Free.",
        homepageUrl: "https://loyaltie.com",
        docsUrl: "https://loyaltie.com/skill.md",
        categories: ["shopping"],
    },
    auth: {
        /** Public server: no secret to inject (empty credential shape). */
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    request: {
        baseUrl: "https://loyaltie.com",
        headers: {
            Accept: "application/json",
            "MCP-Protocol-Version": "2025-11-25",
        },
    },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        /** JSON-RPC envelope → the tool's result: `structuredContent` when
         *  present, else the JSON text content. Tool-level errors (a UCP
         *  error envelope with `messages`, `isError: true`) come back in the
         *  same shape, so agents read `messages` either way. A JSON-RPC
         *  protocol error returns `{error}`. */
        fromResponse: ({ data }) => {
            const out = data.output as Record<string, unknown> | null;
            if (out === null || typeof out !== "object") return out;
            const err = out.error as Record<string, unknown> | undefined;
            if (err !== undefined) {
                return { error: `${err.message ?? "MCP error"}` };
            }
            const result = out.result as Record<string, unknown> | undefined;
            if (result === undefined) return out;
            if (result.structuredContent !== undefined) {
                return result.structuredContent as never;
            }
            const content = result.content as
                | Array<Record<string, unknown>>
                | undefined;
            if (content === undefined || content.length === 0) {
                return result as never;
            }
            const text = `${content[0].text ?? ""}`;
            try {
                return JSON.parse(text);
            } catch (_e) {
                return result.isError === true ? { error: text } : { text };
            }
        },
    },
});
