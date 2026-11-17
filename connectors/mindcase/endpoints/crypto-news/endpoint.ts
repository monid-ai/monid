import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCryptoNewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `crypto/news`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Crypto News",
        summary: "Returns recent crypto news articles with project tagging " +
            "across major publishers, filterable by project, source, date " +
            "range or keyword.",
        description:
            "Returns recent crypto news articles with project tagging " +
            "across major publishers, filterable by project, source, date " +
            "range or keyword. Returns one row per article with " +
            "articleId, title, summary, source, url, publishedAt. For " +
            "general news use mindcase#news/mentions; for project " +
            "fundamentals use mindcase#crypto/projects. $0.0045 per " +
            "article; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/crypto/news",
        categories: ["news-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/crypto/news",
    request: { method: "POST", path: "/v1/data/crypto/news/run" },
    input: {
        schema: {
            body: zCryptoNewsBody.extend({
                maxResults: zCryptoNewsBody.shape.maxResults.unwrap().min(1)
                    .default(20).describe(
                        "How many articles to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
