import { defineProvider, presets } from "@shared/core";

/**
 * String — web search and page fetching for agents, past each target's
 * anti-bot protection. JSON-over-HTTP against
 * `https://request.usestring.ai/v1` with `Authorization: Bearer <key>`
 * (portal.usestring.ai/docs/get-started/authentication).
 *
 * This first cut ports only `/search` (see the PR description for why
 * `/fetch`, `/sitemap`, and the rest of the surface are left for a later
 * PR). Sourced entirely from String's own public docs, not third-party
 * reverse engineering — String is durable-alpha's own product, so the docs
 * are authoritative here rather than something to verify live against a
 * key the repo's author didn't have in hand while drafting this.
 *
 * Priced at the Growth-tier rate ($1.00/1,000 searches) — see
 * endpoints/search/endpoint.ts.
 */
export default defineProvider({
    name: "string",
    meta: {
        displayName: "String",
        summary: "Web search and page fetching for agents, past anti-bot " +
            "and CAPTCHA protection.",
        description: "Search the web and fetch any page as clean, " +
            "LLM-ready content — automatic proxy rotation, anti-bot and " +
            "CAPTCHA handling, and JavaScript rendering when a page needs " +
            "it. Search covers Google, DuckDuckGo, Brave, and Mojeek, " +
            "including Google's rendered surfaces (ads, local packs, " +
            "knowledge panels, AI overviews, and more) alongside ranked " +
            "results.",
        homepageUrl: "https://usestring.ai",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/overview",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://request.usestring.ai/v1" },
    // Google paging can run String's own documented 45-second search
    // budget before returning a still-200 partial result (see
    // "Result count and paging" on the /search docs page).
    timeouts: { requestMs: 50_000, runMs: 55_000 },
    usage: {
        // String bills in plan-tier USD, not a vendor "credits" unit, and
        // exposes no consolidate-able receipt on the response — quoted
        // here at the Growth-tier rate.
        credits: {
            default: {
                label: "US dollars (Growth-tier rate)",
            },
        },
    },
});
