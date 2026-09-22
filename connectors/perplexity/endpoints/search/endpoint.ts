import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPerplexitySearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Perplexity Search",
        summary: "Search for ranked web sources with extracted content.",
        description: "Retrieve source URLs, titles, query-relevant snippets, " +
            "and available publication/update dates. Supports web or people " +
            "search, domain and language filters, country targeting, date " +
            "and recency filters, and extracted-content token budgets. " +
            "Submit a single query or up to five queries in one request. " +
            "Returns sources, not an AI-written answer or a full-page dump.",
        docsUrl: "https://docs.perplexity.ai/api-reference/search-post",
        categories: ["web-search"],
        notes: [
            "Omit search_context_size when using max_tokens or " +
            "max_tokens_per_page. No context default is injected by this " +
            "connector; caller-supplied conflicts are sent unchanged for " +
            "upstream validation.",
            "max_results above 20 requires search_type=people; the upstream " +
            "API validates this cross-field rule.",
            "For people search, omit search_context_size. Live checks on " +
            "2026-09-22 returned HTTP 400 with explicit low, medium or high; " +
            "omitting it worked with max_results=50 and with token budgets.",
            "Use a domain allowlist or denylist alone. A mixed-mode request " +
            "was accepted in live checks; do not rely on upstream rejection " +
            "or assume mixed-mode semantics.",
            "The upstream API validates calendar dates and date ordering.",
            "One successful HTTP request is one billing unit, including " +
            "empty results and up to five queries. Each query independently " +
            "consumes a rate-limit unit.",
            "Live checks on 2026-09-22 accepted 10, 11 and 20 distinct " +
            "language codes. The schema follows the reference's 20-code " +
            "limit; the quickstart still documents 10.",
            "A local timeout does not prove the upstream request was " +
            "unbilled. This connector adds no automatic retries.",
        ],
    },
    request: { method: "POST", path: "/search" },
    input: {
        // Preserve native optional defaults, especially context: materializing
        // "high" here would conflict with caller-supplied token budgets.
        schema: { body: zPerplexitySearchBody },
    },
    usage: {
        // Published upstream rate, not Monid's hosted retail price.
        // https://docs.perplexity.ai/getting-started/pricing
        // No vendor cost receipt or per-query/result multiplier is present.
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.005 },
            label: "successful search request",
            description: "One successful request, including up to five queries",
        },
    },
});
