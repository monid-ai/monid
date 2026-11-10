import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff List debts",
        summary: "List debts",
        description:
            "Use this when the user asks what they owe or which debt terms are missing. Get the user's debts (cards and loans): names with last digits, balances with balanceAsOf, APRs, minimum payments, and totals. Use for debt, interest rate, or payoff-priority questions. Requires BetterOff Core and debts:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/list_debts",
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
                    name: "betteroff_list_debts",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
