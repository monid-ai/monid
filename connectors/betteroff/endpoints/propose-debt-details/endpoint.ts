import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Propose debt details",
        summary: "Propose debt details",
        description:
            "Use this when the user provides a debt's APR, minimum payment, or next due date to save. Propose saving debt details the user states in chat: APR, minimum payment, or next due date, e.g. 'my Chase card APR is 24.99%'. Pass debtId from betteroff_list_debts, else the debt name. Use only numbers the user stated. This changes nothing until the user approves it at the review link; never say it is done. Requires BetterOff Core and debts:read, corrections:prepare in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
            "This tool writes state. Call only when requested or approved by the user. A prepared proposal or action is not an applied correction or completed transfer.",
            "No automatic retries. Reuse the original idempotency key for a user-authorized retry of the same request where supported.",
        ],
    },
    endpoint: "/propose_debt_details",
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
                    name: "betteroff_propose_debt_details",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
