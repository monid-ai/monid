import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleSearchBody } from "./schema/inputs.ts";

/**
 * Mindcase `google/search`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Search",
        summary: "Scrape Google Search results (organic links, snippets, " +
            "titles) with country/language filters and search operators.",
        description: "Scrape Google Search results (organic links, snippets, " +
            "titles) with country/language filters and search operators. " +
            "Returns one row per result with rank, title, link, domain, " +
            "source, snippet, publishedDate, aiAnswer, aiAnswerSources, " +
            "relatedSearches, relatedQuestions, organicResultType, " +
            "organicProductInfo, displayedUrl, emphasizedKeywords, views, " +
            "commentsAmount, likes, reactions, channelName, " +
            "followersAmount, lastUpdated, siteLinks, personalInfo, " +
            "hasNextPage, resultsTotal, paidResults, paidProducts, " +
            "suggestedResults, customData and 12 more fields. $0.001 per " +
            "result; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google/search",
        categories: ["web-search"],
        notes: [
            "`maxPages` caps rows per input (about 10 rows per page), so " +
            "a run can return up to that many rows for each `queries` " +
            "entry.",
            "`maxPages` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google/search",
    request: { method: "POST", path: "/v1/data/google/search/run" },
    input: {
        schema: {
            body: zGoogleSearchBody.extend({
                maxPages: zGoogleSearchBody.shape.maxPages.unwrap().min(1)
                    .describe(
                        "Number of Google result pages to scrape (~10 organic results per page). Google itself returns at most ~10 pages (~100 results) per query, so higher values won't return more. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.queries.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = Math.min(body.maxPages, 10) * 10 * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
