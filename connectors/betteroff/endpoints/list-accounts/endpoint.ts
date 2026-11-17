import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff List accounts",
        summary: "List accounts",
        description:
            "Use this when the user asks which accounts are connected or wants account balances. Get the user's connected accounts with balances, types, and institutions. Requires BetterOff Core and accounts:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/list_accounts",
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
                    name: "betteroff_list_accounts",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
