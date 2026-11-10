import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * `get_usage` — added 2026-10-24 alongside `send_feedback`. No arguments:
 * returns the CALLER's own usage snapshot — tier, the current window
 * (daily for a keyless caller, monthly otherwise), calls used/remaining
 * (or `credits_remaining` instead on an agent-credits key — whichever
 * field doesn't apply to the caller's tier comes back `null`), when the
 * window resets, and the per-minute pace limit. Verified live
 * 2026-10-25: the payload's own `counts_against_quota` is always
 * `false` — this call itself is never metered, so there is no reason not
 * to poll it before a batch of other calls.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Get Usage",
        summary: "Your own usage snapshot: calls or credits remaining, " +
            "reset time, pace limit. Always free.",
        description: "Check the caller's own usage against Fund " +
            "Momentum: tier, the current window (daily for a keyless " +
            "caller, monthly otherwise), calls used and `calls_remaining` " +
            "— or `credits_remaining` instead on an agent-credits key, " +
            "whichever field doesn't apply to the caller's tier comes " +
            "back `null` — when the window resets (`resets_at`), and the " +
            "per-minute pace limit (`pace_limit_per_minute`). " +
            "`counts_against_quota` on the response is always `false`: " +
            "this call is never itself metered. Call it before a batch " +
            "of other calls to see how much headroom is left, not after " +
            "each one.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "Always free — never draws a credit and never counts " +
            "against any quota, on any tier, including keyless.",
        ],
    },
    endpoint: "/mcp/get_usage",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: { name: "get_usage", arguments: {} },
                id: 1,
            },
        }),
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
