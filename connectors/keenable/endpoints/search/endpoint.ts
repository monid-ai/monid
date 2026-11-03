import { defineEndpoint } from "@shared/core";
import {
    keenableSearchBodySchema,
    keenableSearchUsage,
} from "../../schema/search-binding.ts";

/**
 * POST /v1/search — ranked web results with extracted snippets.
 *
 * Usage overrides the provider's PER_CALL: a search that found nothing
 * (`results: []`) still draws a Keenable credit (console balance delta,
 * drill 2026-09-28) but bills 0, the v1 posture (design D2).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Web Search",
        summary:
            "Search the web or recent news; each result carries a long page-text extract.",
        description: "Ranked web search over Keenable's own 100B+ page " +
            "index (its own crawler and ranking, not a Google or Bing " +
            "wrapper). One call returns up to 50 results, and each can " +
            "carry a page-text extract of up to 10,000 characters, so " +
            "many questions are answered without a separate fetch. " +
            "Filter by site, by publish date or by index date (dates, " +
            "timestamps, or relative values like 7d). For news, set " +
            'published_after: "2d". query_time searches the web as ' +
            "it stood at a past moment, which gives reproducible " +
            "results for evals, audits and back-tests. Use mode " +
            '"realtime" for the lowest latency and "pro" for ' +
            "deeper ranking. A search with no results is not billed. " +
            "Will not: reproduce Google's exact SERP order, or return " +
            "ads, maps or shopping results; use a Google SERP " +
            "endpoint for those. Results can include several language " +
            "versions of the same page; add site or a language word " +
            "to the query to narrow them. Next: pass result URLs to " +
            "keenable#v1/fetch for the full page as Markdown.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["web-search", "news-search"],
        notes: [
            "One credit per search in either mode. A search that returns " +
            "no results is free.",
        ],
    },
    request: { method: "POST", path: "/v1/search" },
    input: { schema: { body: keenableSearchBodySchema() } },
    usage: keenableSearchUsage,
});
