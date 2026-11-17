import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Propose recurring kind",
        summary: "Propose recurring kind",
        description:
            "Use this when the user says a recurring payment should be a bill or a subscription, for example that a Zelle payment is rent. Propose marking one of the user's recurring outgoing payments as a bill or a subscription. Get the streamId first with betteroff_list_recurring. This tool changes nothing: the user opens the review link and approves it in BetterOff. Never say the change is done. Requires BetterOff Core and cashflow:read, corrections:prepare in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
            "This tool writes state. Call only when requested or approved by the user. A prepared proposal or action is not an applied correction or completed transfer.",
            "No automatic retries. Reuse the original idempotency key for a user-authorized retry of the same request where supported.",
        ],
    },
    endpoint: "/propose_recurring_kind",
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
                    name: "betteroff_propose_recurring_kind",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
