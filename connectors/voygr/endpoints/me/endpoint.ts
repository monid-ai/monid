import { defineEndpoint, UsageModelKind } from "@shared/core";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";

/**
 * /me: `GET /users/me`. Free. The provider relay adds `X-Sub-Account`.
 *
 * WHAT IS KEPT. VOYGR's `/users/me` answers with the PARTNER key's own
 * view: the key and customer ids, the customer name, the key's last four
 * characters, its quota and usage, its balance and holds, its webhook
 * settings and its admin flag. With a sub-account named, only
 * `max_concurrent_calls` and `max_calls_per_day` follow the sub-account
 * (a sub-account with no limit of its own shows the partner's). Everything
 * else describes the partner account, which belongs to Monid and not to a
 * workspace, so none of it may reach a user.
 *
 * This is an ALLOWLIST: a field VOYGR adds later is dropped until someone
 * decides it is about the sub-account. `credits_charge_per_successful_call`
 * and `maintenance` are VOYGR-wide facts, not the partner's.
 * `credits_hold_per_call` is dropped: it is what VOYGR holds per call, not
 * what Monid holds. This `fromResponse` REPLACES the provider's,
 * which is fine: a pick leaves no `customer_id` or `recording_url`. (The
 * provider's `fromError` still applies to errors.)
 */
export default defineEndpoint({
    meta: {
        displayName: "Get My Limits",
        summary: "Read this workspace's PlaceCall limits.",
        description: "Read what this workspace may do with PlaceCall: " +
            "`max_concurrent_calls`, the calls it may have in flight at " +
            "once, and `max_calls_per_day`, the calls it may create per " +
            "UTC day. It also returns what a charged call costs " +
            "(`credits_charge_per_successful_call`) and the current " +
            "maintenance window, if one is set.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["agentic-phone"],
        notes: [
            "Reading limits is free.",
            "`max_concurrent_calls` and `max_calls_per_day` are the limits " +
            "that apply to this workspace. The account's identity, key, " +
            "balance, usage and webhook settings are never returned.",
        ],
    },
    endpoint: "/me",
    request: { method: "GET", path: "/users/me" },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.pick(data.output, [
                "$.max_concurrent_calls",
                "$.max_calls_per_day",
                "$.credits_charge_per_successful_call",
                "$.maintenance",
            ]),
    },
});
