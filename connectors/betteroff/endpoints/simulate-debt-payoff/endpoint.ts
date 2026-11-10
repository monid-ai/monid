import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Simulate debt payoff",
        summary: "Simulate debt payoff",
        description:
            "Use this when the user asks to compare debt payoff strategies. Simulate paying off debts by avalanche (highest APR first) or snowball (smallest balance first), with an optional extra monthly payment. Refuses with missingInputs when a balance, APR, minimum payment, or FX rate is missing; betteroff_propose_debt_details saves terms the user states. Read-only; never moves money. Requires BetterOff Core and debts:read in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
        ],
    },
    endpoint: "/simulate_debt_payoff",
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
                    name: "betteroff_simulate_debt_payoff",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
