import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Keenable (keenable.ai) — web search and page fetch for AI agents.
 * Authenticated REST against `https://api.keenable.ai/v1`, auth
 * `X-API-Key`.
 *
 * Catalog surface: `POST /v1/search` plus four presets that share that
 * path (`/v1/search-news`, `/v1/search-as-of`, `/v1/search-contents`,
 * `/v1/search-papers`), and `GET /v1/fetch` plus a prompt-required
 * twin (`/v1/fetch-answer`). The keyless
 * `/public` twins exist to evaluate the API without an account (shared
 * per-IP pool, `X-Keenable-Title`, no credits) and are not exposed —
 * design D1.
 *
 * Billing: the Monid-facing pool is US dollars, the Exa / Apify
 * posture: vendors whose published prices are in dollars pin them in
 * the doc so discover can price without a separate broker-card row.
 * The prices are the hosted adaptor's (design D9 revision, D11): $0.004
 * per search with results (`results: []` bills 0) and $0.001 per
 * fetch. Every 2xx body carries Keenable's `usage` receipt (since
 * 2026-11-12); `usage.consolidate` removes it from the output and
 * makes no claim, so the derived fold settles.
 *
 * Every call sends `X-Keenable-Title: Monid`, the attribution header
 * Keenable asked for (design D11).
 */
export default defineProvider({
    name: "keenable",
    meta: {
        displayName: "Keenable",
        summary:
            "Search the live web and read the top pages in one call, plus clean page fetch.",
        description: "Independent web search and page fetch for agents " +
            "over Keenable's own 100B+ page index (its own crawler and " +
            "ranking, not a Google or Bing wrapper). Phrase the " +
            "query as a description of the " +
            "page you want. One search returns up to 50 ranked " +
            "results, each with a page-text extract of up to 10,000 " +
            "characters, so search-and-read is a single call — no " +
            "second contents hop. $0.004 per search with results, " +
            "extracts included. Filter by site, publish date, or " +
            "index date (dates, timestamps, or relative values like " +
            "7d). query_time searches the web as it stood at a past " +
            "moment. Fetch turns a public URL into clean Markdown " +
            "($0.001 per page), served from the index or read live " +
            "when the page is not " +
            "indexed (live: true always reads live); an optional prompt asks a question about the " +
            "page instead of returning the full text. Will not " +
            "reproduce Google's exact SERP order, synthesize a " +
            "structured object across sources, or return ads, maps, " +
            "or shopping results.",
        homepageUrl: "https://keenable.ai",
        docsUrl: "https://docs.keenable.ai",
        categories: [
            "web-search",
            "news-search",
            "academic-search",
            "web-scraping",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: {
        baseUrl: "https://api.keenable.ai",
        /** Keenable asked Monid to name itself on every call; the
         *  hosted adaptor sends it too (design D11). */
        headers: { "X-Keenable-Title": "Monid" },
    },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26 / D9): the published prices
         *  are in dollars, so the pool is USD — same as exa. The
         *  provider model is fetch's $0.001 per call (Keenable's fetch
         *  rate for Monid); the search docs override it with $0.004
         *  per search with results (schema/search-binding.ts). */
        credits: { default: { label: "US dollars" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.001 },
        },
        /** Keenable's `usage` receipt (`{sku, amount, credits, paid,
         *  credits_remaining}` on every 2xx body since 2026-11-12) is
         *  Monid's account state with Keenable, so it leaves the
         *  output here, as the hosted adaptor removes it (design D11).
         *  The claim stays EMPTY: `credits` counts Keenable credits
         *  (1 per search, 0.25 per fetch), not dollars, and `paid`
         *  says whether Monid's account paid, not what the buyer
         *  owes, so the derived fold settles. `pluck` is exact: only
         *  the top-level receipt goes (octen posture). */
        consolidate: ({ data, utils }) => ({
            credits: {},
            output: utils.json.pluck(data.output, "$.usage").rest,
        }),
    },
});
