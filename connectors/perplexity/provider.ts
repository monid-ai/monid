import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "perplexity",
    meta: {
        displayName: "Perplexity",
        summary: "Ranked web search results with query-relevant content.",
        description: "Search the web and return ranked source URLs, titles, " +
            "extracted snippets, and available dates. Use these sources in " +
            "your own agent or retrieval pipeline; this connector does not " +
            "generate an answer.",
        homepageUrl: "https://www.perplexity.ai",
        docsUrl: "https://docs.perplexity.ai/api-reference/search-post",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://api.perplexity.ai",
        headers: {
            "X-Pplx-Integration": "monid",
            "User-Agent": "monid (+https://monid.ai)",
        },
    },
    // Initial request budget, not a measured service-level guarantee.
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: { credits: { default: { label: "US dollars" } } },
});
