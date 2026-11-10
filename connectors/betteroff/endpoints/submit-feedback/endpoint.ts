import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Submit feedback",
        summary: "Submit feedback",
        description:
            "Send a diagnostic report to BetterOff support only when the user requests or approves sending it. Creates a support case, not a financial correction. Never send conversation history, balances, transactions, tool payloads, or credentials. Reuse the idempotency key when retrying. Returns a receipt, not a promise of resolution. Requires BetterOff Core and feedback:submit in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
            "This tool writes state. Call only when requested or approved by the user. A prepared proposal or action is not an applied correction or completed transfer.",
            "No automatic retries. Reuse the original idempotency key for a user-authorized retry of the same request where supported.",
            "userApproved must reflect actual user consent; the boolean is not proof of consent. Send only the approved diagnostic summary.",
        ],
    },
    endpoint: "/submit_feedback",
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
                    name: "betteroff_submit_feedback",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
