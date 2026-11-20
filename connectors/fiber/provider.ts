import { defineProvider, presets } from "@shared/core";

/**
 * Fiber AI (fiber.ai) — B2B people and company data for GTM agents:
 * live LinkedIn profile and company fetches, person / company resolution
 * from loose identifiers ("kitchen sink"), reverse email lookup, and a
 * low-cost contact reveal. Six synchronous endpoints against
 * `https://api.fiber.ai/v1`.
 *
 * AUTH: Fiber accepts the key as `body.apiKey`, an `x-api-key` header,
 * or `Authorization: Bearer` (the API's own precedence, in that order).
 * The header keeps the credential out of the request body the engine
 * builds, so `presets.auth.header("x-api-key")` — no `apiKey` field is
 * mirrored on any input schema.
 *
 * BILLING: Fiber meters in its OWN credits (fractional, per item
 * delivered — "a search that returns nothing costs nothing"), and every
 * chargeable 2xx carries the authoritative draw as
 * `chargeInfo.creditsCharged` in WHOLE credits (net of any refund).
 * Per-org pricing can differ from the published card, so the pool is
 * Fiber credits and the dollar conversion stays the broker card's job
 * (firecrawl's posture). The pinned per-line amounts on each endpoint
 * are Fiber's platform defaults (`OperationPricingV2Schema` in
 * fiber-ai/common, 2026-11) and become the per-run cross-check.
 */
export default defineProvider({
    name: "fiber",
    meta: {
        displayName: "Fiber AI",
        summary: "Live LinkedIn data, person and company resolution, " +
            "reverse email lookup, and contact reveal.",
        description: "Fiber AI — B2B people and company data built for " +
            "GTM agents. Fetch a LinkedIn profile or company page live " +
            "(work history, education, skills, headcount, firmographics), " +
            "resolve a person or company from whatever you have (name + " +
            "company, email, domain, LinkedIn URL, school, location), turn " +
            "an email address into the person behind it, and reveal a " +
            "person's work email, personal email, or phone from a " +
            "LinkedIn URL or name + company domain. Every paid call is " +
            "charged per item delivered — a miss costs nothing.",
        homepageUrl: "https://fiber.ai",
        docsUrl: "https://api.fiber.ai/docs",
        categories: ["people-enrichment", "company-enrichment", "linkedin"],
        notes: [
            "Fiber answers a non-2xx with `{message}` (plus a request id " +
            "in some errors); 429 is the per-key rate limit, and 402 / 403 " +
            "mean the account's credit balance or a per-key credit limit " +
            "is exhausted — all settle as provider errors with zero usage.",
            "A person or email on Fiber's opt-out list answers 410 with " +
            "no data and no charge.",
            "Fiber returns `warnings` for request fields it ignored and " +
            "may return `advice` with suggested follow-up calls; both " +
            "pass through unchanged.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.fiber.ai/v1" },
    // Fiber's own recommendedTimeout per route is 30-120 s (lite contact
    // reveal waits on email deliverability checks); the request ceiling
    // covers the slowest, every endpoint is synchronous.
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** THE credit system (design D26): one pool, Fiber credits. */
        credits: { default: { label: "Fiber credits" } },
        /** The vendor's OWN claim (design D27): `chargeInfo` is a billing
         *  receipt, not data — pluck the whole node out of the payload
         *  and read `creditsCharged` (whole credits) off it. Plucking the
         *  node also removes `chargeInfo.lowCreditAlert`, which reports
         *  the SHARED Monid account's balance and must never reach a
         *  caller (clay's `period_quota` rule). Entry OMITTED when the
         *  receipt is absent (never `?? 0`) so the derived fold settles;
         *  a present claim WINS and the pinned rates cross-check it. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.chargeInfo",
            );
            const charged = value === undefined
                ? undefined
                : utils.json.optionalNum(value, "$.creditsCharged");
            return {
                credits: {
                    ...(charged !== undefined ? { default: charged } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Fiber's error envelope is `{message}` (Fastify's own 4xx adds
         *  `statusCode` / `error`). Vendor non-2xx is DATA — the engine
         *  zero-bills it. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const error = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Fiber API error",
                ...(typeof error === "string" ? { error } : {}),
                raw: data.output,
            };
        },
    },
});
