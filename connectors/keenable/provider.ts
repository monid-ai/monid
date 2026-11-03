import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Keenable (keenable.ai) — web search and page fetch for AI agents.
 * Authenticated REST against `https://api.keenable.ai/v1`, auth
 * `X-API-Key`.
 *
 * Catalog surface: `POST /v1/search` plus two presets that share that
 * path (`/v1/search-news`, `/v1/search-as-of`), and `GET /v1/fetch`
 * plus a prompt-required twin (`/v1/fetch-answer`). The keyless
 * `/public` twins exist to evaluate the API without an account (shared
 * per-IP pool, `X-Keenable-Title`, no credits) and are not exposed —
 * design D1.
 *
 * Billing: Keenable meters authenticated usage in credits (one per
 * search or fetch). REST responses carry no usage receipt, so there
 * is no `usage.consolidate` and the derived fold settles (design D2).
 * The Monid-facing pool is US dollars, pinned at the dedicated-capacity
 * volume rate of $0.001 per successful call ($1 / 1,000 requests at
 * 100+ RPS — keenable.ai/pricing, 2026-11-03). That is the Exa / Apify
 * posture: vendors whose published prices are in dollars pin them in
 * the doc so discover can price without a separate broker-card row.
 * Pay-as-you-go Builder is $0.004; this connector does not use it
 * because Monid's aggregate search traffic is volume. Search still
 * bills 0 when `results: []`.
 */
export default defineProvider({
    name: "keenable",
    meta: {
        displayName: "Keenable",
        summary:
            "Fast independent web search with long page-text extracts, plus clean page fetch.",
        description: "Independent web search and page fetch for agents " +
            "over Keenable's own 100B+ page index (its own crawler and " +
            "ranking, not a Google or Bing wrapper; vendor-claimed " +
            "sub-250ms p95). Search returns up to 50 ranked results, " +
            "each with a page-text extract of up to 10,000 characters, " +
            "so many questions are answered without a separate fetch. " +
            "Filter by site, publish date, or index date (dates, " +
            "timestamps, or relative values like 7d). query_time " +
            "searches the web as it stood at a past moment. Fetch " +
            "turns a public URL into clean Markdown and falls back to " +
            "a live retrieve when the page is not in the index; an " +
            "optional prompt asks a question about the page instead of " +
            "returning the full text. Will not reproduce Google's " +
            "exact SERP order, or return ads, maps, or shopping " +
            "results.",
        homepageUrl: "https://keenable.ai",
        docsUrl: "https://docs.keenable.ai",
        categories: ["web-search", "news-search", "web-scraping"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.keenable.ai" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26 / D9): Keenable's native
         *  meter is one vendor credit per search or fetch, but the
         *  published prices are in dollars, so the pool is USD — same
         *  as exa. $0.001 is the volume rate (dedicated capacity,
         *  $1 / 1,000). No `consolidate`: no REST body carries a
         *  receipt. */
        credits: { default: { label: "US dollars" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
