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
        summary: "Search the live web and read page-text extracts in one call.",
        description: "Ranked web search over Keenable's own 100B+ page " +
            "index (its own crawler and ranking, not a Google or Bing " +
            "wrapper). Phrase the query as a description of the page " +
            "you want. One call returns up to 50 results, and each " +
            "can carry a page-text extract of up to 10,000 " +
            "characters, so live-web context is a single $0.001 " +
            "search — no second contents hop. Set " +
            "snippet_max_length to 10000, or use " +
            "keenable#v1/search-contents, when you want the longest " +
            "extracts. Filter by site, by publish date or by index " +
            "date (dates, timestamps, or relative values like 7d). " +
            'For news, set published_after: "2d" or use ' +
            "keenable#v1/search-news. For research papers, add site " +
            "(arxiv.org, aclanthology.org) or use " +
            "keenable#v1/search-papers. query_time searches the web " +
            'as it stood at a past moment. Use mode "realtime" for ' +
            'the lowest latency and "pro" for deeper ranking. A ' +
            "search with no results is not billed. Will not: " +
            "reproduce Google's exact SERP order, synthesize a " +
            "structured object across sources, or return ads, maps " +
            "or shopping results. Results can include several " +
            "language versions of the same page; add site or a " +
            "language word to the query to narrow them. Next: " +
            "keenable#v1/fetch for the full page as Markdown.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["web-search", "news-search"],
        notes: [
            "$0.001 per search with results (volume rate, either mode). " +
            "A search that returns no results is free.",
        ],
    },
    request: { method: "POST", path: "/v1/search" },
    input: { schema: { body: keenableSearchBodySchema() } },
    usage: keenableSearchUsage,
});
