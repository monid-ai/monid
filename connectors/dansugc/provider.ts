import { defineProvider, presets } from "@shared/core";

/**
 * DansUGC (dansugc.com) — a library of real-human UGC reaction clips:
 * short vertical videos filmed by real creators (never AI), licensed per
 * clip for ads and organic posts. This port carries the B-roll surface
 * only: search (keyword or natural-language), the filter vocabulary, one
 * clip's details, and licensing clips. Four synchronous endpoints against `https://dansugc.com/api/v1`,
 * auth `Authorization: Bearer dsk_…` (the REST API needs a Scale
 * subscription; other plans answer 403 subscription_required).
 *
 * Billed in DansUGC credits, ONE pool (a top-up buys 1 credit per $1;
 * subscription plans include more credits per dollar). Only
 * `POST /broll/purchase` spends credits, and it reports its own charge as
 * `total_amount` — that endpoint's own claim. Every other endpoint is
 * FREE, so the provider declares no consolidate and a generic evidence
 * that counts nothing.
 */
export default defineProvider({
    name: "dansugc",
    meta: {
        displayName: "DansUGC",
        summary: "Search and license real-human UGC reaction clips " +
            "(never AI) for ads and organic posts.",
        description: "DansUGC — a library of 5,000+ real-human UGC " +
            "reaction clips (filmed by real creators, never AI) for app, " +
            "consumer and DTC marketing. Search clips by keyword or by " +
            "describing the shot, filter by emotion, gender, age range, " +
            "location, hair color and outfit, check a clip's details and " +
            "price, then license clips and get their download links. " +
            "Licensing includes commercial use in paid ads and organic " +
            "posts. Prices are in DansUGC credits: through Monid every clip " +
            "is a flat 13 credits.",
        homepageUrl: "https://dansugc.com",
        docsUrl: "https://dansugc.com/docs",
        categories: ["stock-media"],
        notes: [
            "The REST API needs a DansUGC Scale subscription on the key's " +
            "account; other plans answer 403 subscription_required.",
            "Errors answer `{error}` (a 409 purchase confirmation adds " +
            "`requiresConfirmation` and `expectedTotalCents`). Every " +
            "non-2xx settles with zero usage.",
            "60 requests per minute per key; a 429 carries Retry-After: 60.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://dansugc.com/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: {
        /** ONE pool: DansUGC credits (dansugc.com/pricing). Top-ups and
         *  subscription allowances fill the same balance. */
        credits: { default: { label: "DansUGC credits" } },
        /** Generic QUANTITIES default (design D27): the FREE docs have
         *  nothing to count; the purchase doc states its own basis. */
        evidence: () => ({ counts: {} }),
    },
    output: {
        /** DansUGC's error envelope `{error}` (plus, on a 409 purchase
         *  confirmation, `requiresConfirmation` + `expectedTotalCents`) →
         *  `{message, error_code?, expected_total_cents?, raw}` (design D4),
         *  so an agent can read the confirmed total straight off the
         *  result and repeat the purchase with it. */
        fromError: ({ data, utils }) => {
            const error = utils.json.optionalGet(data.output, "$.error");
            const confirm = utils.json.optionalGet(
                data.output,
                "$.requiresConfirmation",
            );
            const expected = utils.json.optionalGet(
                data.output,
                "$.expectedTotalCents",
            );
            const code = utils.json.optionalGet(data.output, "$.code");
            return {
                message: typeof error === "string" && error !== ""
                    ? error
                    : "DansUGC API error",
                ...(confirm === true
                    ? { error_code: "requires_confirmation" }
                    : typeof code === "string"
                    ? { error_code: code }
                    : {}),
                ...(typeof expected === "number"
                    ? { expected_total_cents: expected }
                    : {}),
                raw: data.output,
            };
        },
    },
});
