import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFundmomentumSendFeedbackArgs } from "./schema/inputs.ts";

/**
 * `send_feedback` — added 2026-10-24 alongside `get_usage`. Free-text
 * feedback on a tool or the server generally; always free, including
 * keyless. Capped at 5 calls per caller per UTC day server-side — the
 * connector does not pre-enforce this, a 6th same-day call is the
 * vendor's own rejection. No reply or notification is ever generated:
 * verified live 2026-10-25, the success payload is an explicit one-way
 * acknowledgement ("Nobody is notified instantly and there is no reply
 * to this message."), not a support ticket.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Send Feedback",
        summary: "Send free-text feedback on a tool or the server. " +
            "Always free; one-way, no reply.",
        description: "Send a short piece of feedback — a bug, bad or " +
            "missing data, a missing feature, or anything else — about " +
            "Fund Momentum generally or about one specific tool. " +
            "Optionally tag it with 'category' ('bug', 'data_issue', " +
            "'missing_feature', or 'other'; defaults to 'other') and " +
            "'tool_name', which must be one of Fund Momentum's own " +
            "tool names exactly ('search_funds', 'get_fund', etc.) — an " +
            "unrecognized value is rejected. Capped at 5 calls per " +
            "caller per UTC day server-side. Nobody is notified and " +
            "there is no reply: this is a one-way drop, not a support " +
            "channel.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "Always free. Capped at 5 calls per caller per UTC day by " +
            "the vendor; no reply or notification is ever generated.",
        ],
    },
    endpoint: "/mcp/send_feedback",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        schema: { body: zFundmomentumSendFeedbackArgs },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "send_feedback",
                    arguments: data.input.body ?? {},
                },
                id: 1,
            },
        }),
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
