import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Get action request",
        summary: "Get action request",
        description:
            "Use this when the user asks whether a requested transfer was approved, sent, or confirmed. Read a USDC transfer, bank transfer, or vault deposit request's status from BetterOff's records. Requires BetterOff Core and transfers:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/get_action_request",
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
                    name: "betteroff_get_action_request",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
