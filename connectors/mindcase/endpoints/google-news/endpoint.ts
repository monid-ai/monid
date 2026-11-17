import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleNewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google/news`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google News",
        summary: "Get Google News articles for any search query (headline, " +
            "publisher, published date, link, and thumbnail) with " +
            "region/language and date-range filters.",
        description:
            "Get Google News articles for any search query (headline, " +
            "publisher, published date, link, and thumbnail) with " +
            "region/language and date-range filters. Returns one row per " +
            "new with title, source, articleUrl, publishedAt, " +
            "publishedTimestamp, imageUrl. $0.002 per new; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google/news",
        categories: ["news-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google/news",
    request: { method: "POST", path: "/v1/data/google/news/run" },
    input: {
        schema: {
            body: zGoogleNewsBody.extend({
                maxResults: zGoogleNewsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of news articles to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
