import { defineProvider, presets } from "@shared/core";

/**
 * SocialCrawl (socialcrawl.dev) — one JSON envelope for public social
 * data. Every call is a synchronous GET against `https://www.socialcrawl.dev`
 * with an `x-api-key` header (the vendor also accepts
 * `Authorization: Bearer`; this connector sends the header the docs lead
 * with). Paths keep the `/v1` prefix, so the public id is the vendor route.
 *
 * BILLING. One pool of SocialCrawl credits. Every response, success or
 * failure, reports the net charge on `credits_used` and the balance on
 * `credits_remaining`. Cache hits, idempotent replays, and failed calls
 * are 0. The provider owns both halves of the settle (design D26/D27):
 *
 *   - `usage.evidence` counts `credits_used` on a leaf PER_UNIT doc, so
 *     the fold IS the vendor's number. A zero is a real answer (a cache
 *     hit, a dry run, a refund) and must fold to zero: a zero claim is
 *     pruned and would otherwise fall back to whatever else the fold
 *     derived.
 *   - `usage.consolidate` claims the same figure and plucks both billing
 *     fields out of the payload. An absent meter omits the claim.
 *
 * Dollar conversion is the broker card's job (owner rule 2026-09-15).
 * The owner's Growth plan prices a credit at £0.00245, about $0.0032
 * USD; that rate is the card's one `default` row, not a number in the
 * doc. Each endpoint's `usage.estimate` is the published CEILING (the
 * hold). The receipt settles the run, so a cache hit, a refund, or a
 * Discover run that spends less than `max_credits` bills what
 * `credits_used` says.
 */
export default defineProvider({
    name: "socialcrawl",
    meta: {
        displayName: "SocialCrawl",
        summary:
            "Unified social media data API for Instagram, TikTok, LinkedIn, YouTube and more, in one JSON shape.",
        description: "Public social data through one API key and one JSON " +
            "envelope. Profile posts, profile videos, a LinkedIn member " +
            "profile, a YouTube transcript, and a cross-platform Discover " +
            "search all come back with the platform payload under `data`, " +
            "the same pagination block on lists, and the call's own credit " +
            "draw on the envelope. Reach for the platform endpoint when " +
            "you already know the account or the video, and for Discover " +
            "when the question is who is talking about a topic across " +
            "platforms.",
        homepageUrl: "https://www.socialcrawl.dev",
        docsUrl: "https://www.socialcrawl.dev/docs",
        categories: ["instagram", "tiktok", "linkedin", "youtube"],
        notes: [
            "Authenticate with the x-api-key header. The key is never " +
            "sent on the query string.",
            "Every response reports credits_used (the net charge) and " +
            "credits_remaining (the balance). Cache hits, failed calls, " +
            "refunded empty results, and idempotent replays are 0. Both " +
            "fields are removed from the output; the bill is the claim.",
            "A Growth-plan credit is £0.00245, about $0.0032 USD. This " +
            "connector meters SocialCrawl credits. The broker card prices " +
            "the default pool at that USD rate.",
            "Rate limit: 600 requests per minute and 50 in flight per " +
            "key. On 429 or 503, honor Retry-After. A 401, 402, or 404 " +
            "is data and settles at zero.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://www.socialcrawl.dev" },
    /** A single page answers in well under a minute. List walks and a
     *  Discover call that fits one request can run longer; those
     *  endpoints raise the budget. */
    timeouts: { requestMs: 60_000, runMs: 70_000 },
    usage: {
        /** THE credit system (design D26): ONE pool, SocialCrawl's own
         *  credits, the unit `credits_used` counts. The $/credit
         *  conversion stays on the broker card. */
        credits: {
            default: {
                label: "SocialCrawl credits",
                description: "SocialCrawl credits, reported on every " +
                    "response as credits_used. Growth plan: £0.00245 per " +
                    "credit, about $0.0032 USD — the broker card's rate " +
                    "for this pool.",
            },
        },
        /** THE RECEIPT IS THE EVIDENCE. A leaf PER_UNIT doc counts
         *  `credits_used`, including 0, so a pruned zero claim falls
         *  back to a fold of zero. An absent meter counts nothing. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const used = utils.json.optionalNum(data.output, "$.credits_used");
            return {
                counts: used === undefined
                    ? {}
                    : { [data.usage.model.unit]: used },
            };
        },
        /** THE VENDOR'S OWN CLAIM (design D27): pluck `credits_used` and
         *  `credits_remaining` off the envelope (receipts, not data).
         *  The claim is omitted when the meter is absent, never `?? 0`. */
        consolidate: ({ data, utils }) => {
            const used = utils.json.pluck(data.output, "$.credits_used");
            const remaining = utils.json.pluck(
                used.rest,
                "$.credits_remaining",
            );
            return {
                credits: {
                    ...(typeof used.value === "number"
                        ? { default: used.value }
                        : {}),
                },
                output: remaining.rest,
            };
        },
    },
    output: {
        /** Error envelope `{success:false, error:{type, message, status,
         *  doc_url}}`. Vendor non-2xx is DATA and settles at zero. Branch
         *  on `error.type` (`INVALID_API_KEY`, `RESOURCE_NOT_FOUND`,
         *  `INSUFFICIENT_CREDITS`, …). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.type");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "SocialCrawl API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
