import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";
import { zOutput } from "./schema/output.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Cancel action request",
        summary: "Cancel action request",
        description:
            "Use this when the user asks to cancel a transfer request before signing it. Cancel a USDC transfer, bank transfer, or vault deposit request before the user signs or approves it. Requires BetterOff Core and transfers:prepare in this caller's OAuth grant.",
        notes: [
            "Preserve returned dates, warnings, quality, evidence, pagination, and review links.",
            "This tool writes state. Call only when requested or approved by the user. A prepared proposal or action is not an applied correction or completed transfer.",
            "No automatic retries. Reuse the original idempotency key for a user-authorized retry of the same request where supported.",
            "Cancellation takes effect immediately if BetterOff permits it; this is not a preview. Requests already signing or approved may not be cancellable.",
        ],
    },
    endpoint: "/cancel_action_request",
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
                    name: "betteroff_cancel_action_request",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
