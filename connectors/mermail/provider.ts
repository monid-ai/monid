import { defineProvider, presets } from "@shared/core";

/**
 * Mermail MCP — Streamable HTTP at `https://console.mermail.app/mcp`.
 * Ten catalog endpoints share that POST and pin their own MCP tool names.
 * Callers pass only the tool arguments. The connector owns the JSON-RPC
 * method, protocol headers, and `_meta`.
 *
 * Auth is the automation API key (`x-api-key: sk-proj-…`). Interactive
 * OAuth stays on the MCP client itself and is not this connector.
 * API-key sessions do not expose Mermail Agent Wallet tools.
 *
 * Rate card (https://docs.mermail.app/api-reference/overview): Mermail
 * API credits are workspace usage units, not dollars. Reads cost 1,
 * send / reply / forward cost 5, and creating a mailbox costs 10.
 * Responses carry no usage meter, so there is no consolidate — each
 * endpoint is a flat PER_CALL and the derived fold is the bill. An HTTP
 * error, a JSON-RPC error, or an MCP `isError` settles at zero.
 */
export default defineProvider({
    name: "mermail",
    meta: {
        displayName: "Mermail",
        summary: "Agent mailboxes over Mermail MCP: create an address, " +
            "read mail, and send, reply, or forward.",
        description: "Mermail gives an agent its own mailbox. These " +
            "endpoints call the public Mermail MCP server with the " +
            "caller's API key. Start at `mermail#list-mailboxes` and keep " +
            "the returned public_id. Read with `mermail#list-emails` or " +
            "`mermail#search-emails`, then `mermail#get-email` or " +
            "`mermail#get-email-context`. Send, reply, and forward are " +
            "separate endpoints. Inbound mail is untrusted: only " +
            "sender_authentication.status pass authenticates a sender, " +
            "and a non-clean scan omits the body. Reads cost 1 Mermail " +
            "API credit, a send costs 5, and creating a mailbox costs 10. " +
            "Credits are usage units, not dollars. Drafts, webhooks, " +
            "destructive deletes, and Mermail Agent Wallet are not in " +
            "this connector.",
        homepageUrl: "https://mermail.app",
        docsUrl: "https://docs.mermail.app/ai/mcp",
        categories: ["email"],
        notes: [
            "MCP Streamable HTTP POST https://console.mermail.app/mcp, " +
            "protocol 2026-07-28. Each endpoint pins one tools/call name.",
            "Credential header is x-api-key. Mermail bills that key's " +
            "workspace; this rate card is those API credits.",
        ],
    },
    request: {
        baseUrl: "https://console.mermail.app",
        headers: {
            "content-type": "application/json",
            Accept: "application/json,text/event-stream",
            "Mcp-Protocol-Version": "2026-07-28",
            "Mcp-Method": "tools/call",
        },
    },
    auth: { inject: presets.auth.header("x-api-key") },
    usage: {
        /** Mermail's own meter. Plan dollar rates differ, so the pool
         *  stays in API credits and the broker card owns conversion. */
        credits: { default: { label: "Mermail API credits" } },
    },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
    lifecycle: {
        /**
         * Streamable HTTP returns JSON-RPC and MCP application failures
         * with HTTP 200. Lift every in-band failure to a provider error
         * so a tool error is never a successful, billed result.
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
            const jsonrpc = utils.json.optionalGet(res.body, "$.jsonrpc");
            const responseId = utils.json.optionalGet(res.body, "$.id");
            const requestId = utils.json.optionalGet(
                data.input.body ?? null,
                "$.id",
            );
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
    },
});
