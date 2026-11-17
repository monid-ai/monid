import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Request bank transfer",
        summary: "Request bank transfer",
        description:
            "Use this when the user asks to move money between two of their own bank or brokerage accounts linked in Banking. Request a bank transfer through Natural between two of the user's own accounts linked in BetterOff Banking. Call without account IDs or amount to list the accounts and the per-transfer cap. Saves a request for the user to review; never approves or starts the transfer. Return the review link and say it awaits the user's passkey approval. Requires BetterOff Core and accounts:read, transfers:bank in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
            "This tool writes state. Call only when requested or approved by the user. A prepared proposal or action is not an applied correction or completed transfer.",
            "No automatic retries. Reuse the original idempotency key for a user-authorized retry of the same request where supported.",
            "Return the authenticated review link. Never approve, sign, or execute an action through this connector. Transfer scopes require the generic MCP resource, not the ChatGPT resource.",
        ],
    },
    endpoint: "/request_bank_transfer",
    request: { method: "POST", path: "/mcp" },
    output: { schema: zOutput },
    input: {
        schema: { body: zBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "betteroff_request_bank_transfer",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
