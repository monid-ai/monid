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
 * Billing: Keenable meters authenticated usage in credits, 100,000
 * requests/month free on a direct key; every SKU either doc can select
 * (`search.pro`, `search.realtime`, `fetch`, `fetch.live`, with or
 * without `prompt`) drew one credit (MCP `_meta["keenable/usage"]`,
 * drill 2026-09-28). REST responses carry no usage receipt, so there is
 * no `usage.consolidate` and the derived fold settles (design D2; same
 * posture as pdl). One pool `default`, PER_CALL 1 on the provider;
 * search overrides it so an empty result bills 0.
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
        /** THE credit system (design D26): Keenable's native meter is
         *  credits, one per search (either mode, D3) or fetch (indexed
         *  or live, D4). No `consolidate`: no REST body carries a
         *  receipt. */
        credits: { default: { label: "Keenable credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
