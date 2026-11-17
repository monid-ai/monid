import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNewsMentionsBody } from "./schema/inputs.ts";

/**
 * Mindcase `news/mentions`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "News Headline Search",
        summary:
            "Search global news coverage by headline keywords and get the " +
            "newest matching articles with publish time, language and " +
            "source.",
        description:
            "Search global news coverage by headline keywords and get the " +
            "newest matching articles with publish time, language and " +
            "source. Returns one row per article with title, url, " +
            "publishedAt, language, siteName, siteCountry, siteRank, " +
            "query. For Google News use mindcase#google/news; for " +
            "crypto-specific news use mindcase#crypto/news. $0.0045 per " +
            "article; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/news/mentions",
        categories: ["news-search", "company-news"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/news/mentions",
    request: { method: "POST", path: "/v1/data/news/mentions/run" },
    input: {
        schema: {
            body: zNewsMentionsBody.extend({
                maxResults: zNewsMentionsBody.shape.maxResults.unwrap().min(1)
                    .default(50).describe(
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
