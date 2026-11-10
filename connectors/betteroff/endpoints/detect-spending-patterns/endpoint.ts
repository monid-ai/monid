import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Detect spending patterns",
        summary: "Detect spending patterns",
        description:
            "Use this when the user asks about spending habits, trends, or unusual transactions. Detect spending patterns: frequent merchants, complete-month trends, and unusual transactions (monthly repeats such as rent excluded). Frequent merchants are habits, not bills; use betteroff_list_recurring for recurring charges. Requires BetterOff Core and transactions:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/detect_spending_patterns",
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
                    name: "betteroff_detect_spending_patterns",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
