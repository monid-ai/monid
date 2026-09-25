import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * GrowSurf (growsurf.com) — referral and affiliate programs as an API.
 *
 * One base url (`https://api.growsurf.com/v2`), one bearer key, nine
 * synchronous endpoints. The key is bound to ONE GrowSurf team, so every
 * call here reads or writes that team's own programs — this is a customer
 * operating their own program, not a data vendor answering queries about
 * the world.
 *
 * FREE (designs D25/D27). GrowSurf does not meter its REST API per call:
 * API access is included in the customer's GrowSurf plan and plans differ
 * on RATE LIMIT, not on price (the tinyfish posture). Free-ness is a MODEL
 * fact and the model alone suffices — the quantities fns are
 * compiler-synthesized and there is no vendor meter to consolidate. The
 * money in these payloads (`grossAmount`, commission `amount`) is the
 * CUSTOMER'S OWN sale and payout bookkeeping, never a charge for the call.
 *
 * No `output.fromError`: GrowSurf's error envelope is already a flat
 * `{name, code, message, status, supportUrl}` on every non-2xx, and
 * `code` is the stable machine-readable half.
 */
export default defineProvider({
    name: "growsurf",
    meta: {
        displayName: "GrowSurf",
        summary: "Run a referral or affiliate program: enroll participants, " +
            "credit referrals, record sales, read results.",
        description: "Referral and affiliate programs, operated over an " +
            "API. Enroll someone in a program and get back their own " +
            "referral link; look a participant up by id or email address " +
            "and read who referred them, how many people they have " +
            "brought in, and what they have earned; credit a referral " +
            "when the action you count actually happens, immediately or " +
            "after a refund window; record a sale made by a referred " +
            "customer so their referrer's commission is generated; and " +
            "read program-level results, including a leaderboard ordered " +
            "by referrals, leads, commissions or revenue. The key is " +
            "bound to one GrowSurf team, so these endpoints operate that " +
            "team's own programs rather than answering questions about " +
            "the world.",
        homepageUrl: "https://growsurf.com",
        docsUrl: "https://docs.growsurf.com/developer-tools/rest-api",
        categories: ["referrals"],
        notes: [
            "Every call acts on the one GrowSurf team the API key is bound " +
            "to, and only on the programs that key is allowed to reach. " +
            "There is no cross-team read.",
            "Program ids are the short ids GrowSurf shows in the dashboard " +
            "and in `growsurf#campaigns` (for example `cmng32`), not UUIDs. " +
            "Start from `growsurf#campaigns` when you do not already hold " +
            "one.",
            "REST access depends on the team's GrowSurf plan: calls against " +
            "a referral program need a paid plan (403 " +
            "`PAID_PLAN_REQUIRED_ERROR`) and calls against an affiliate " +
            "program need a payment method on file (402 " +
            "`PAYMENT_METHOD_REQUIRED_ERROR`). Both are account states, not " +
            "bad requests.",
            "The team owner's email address must be verified before the API " +
            "can manage programs. Until it is, those endpoints answer 403 " +
            "with code `EMAIL_NOT_VERIFIED_ERROR`.",
            "Money amounts are integers in the currency's MINOR unit — " +
            "`grossAmount: 9900` is $99.00 in a USD program. Timestamps are " +
            "Unix milliseconds.",
            "GrowSurf does not charge per API call. Responses carry " +
            "`RateLimit` and `RateLimit-Policy`, and a 429 carries " +
            "`Retry-After`, which takes precedence when present.",
            "An error answers `{name, code, message, status, supportUrl}`. " +
            "Branch on `code`, which is stable; `message` is prose.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.growsurf.com/v2" },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: {
        // FREE: nothing here bills. See the header comment — API access is
        // a plan entitlement, and a repricing would be a MODEL change
        // rather than a rate-card surprise.
        model: { kind: UsageModelKind.FREE },
    },
});
