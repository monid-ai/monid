import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Truelist (truelist.io) — email verification. One synchronous REST
 * endpoint against `https://api.truelist.io`, auth
 * `Authorization: Bearer <key>` (truelist.io/docs/api, 2026-10-15).
 *
 * The catalog surface is inline verification (`POST
 * /api/v1/verify_inline`). Batch verification (`POST /api/v1/verify`)
 * is not exposed: the published reference documents neither its
 * response body nor a route to read a batch's results, so no
 * start/poll pair can be built from it. `GET /me` is a free account
 * read with no catalog value (and it echoes the account's API tokens).
 *
 * Billing: prepaid Truelist credits, one per verified address
 * (truelist.io/pricing); `unknown` and catch-all (`accept_all`)
 * answers draw no credit. Responses carry no usage receipt, so there is
 * no `usage.consolidate` and the derived fold settles (pdl / keenable
 * posture). One pool `default`; the endpoint owns its PER_UNIT model.
 */
export default defineProvider({
    name: "truelist",
    meta: {
        displayName: "Truelist",
        summary: "Email verification: deliverability, catch-all, " +
            "disposable and role-address detection.",
        description: "Verify whether an email address is deliverable " +
            "before you send to it. Truelist runs syntax, MX and SMTP " +
            "checks and flags catch-all domains, disposable inboxes and " +
            "role addresses, with a did-you-mean suggestion for typos. " +
            "Unknown and catch-all results are free.",
        homepageUrl: "https://truelist.io",
        docsUrl: "https://truelist.io/docs/api",
        categories: ["people-enrichment"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.truelist.io" },
    // a slow mail server holds the inline answer ~30s before `timed_out`
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (D26): prepaid Truelist credits. */
        credits: { default: { label: "Truelist credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
