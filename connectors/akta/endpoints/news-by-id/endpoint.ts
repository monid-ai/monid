import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNewsByIdQueryParams } from "./schema/inputs.ts";

/** GET /v1/news/by-id — full article records for known news ids. */
export default defineEndpoint({
    meta: {
        displayName: "Akta News Details",
        summary: "Complete news article records by article id.",
        description: "Fetch the complete enriched record for one or more " +
            "news article ids from the Akta News endpoint: full article " +
            "text, AI summary, sentiment, event tags, industries, named " +
            "entities, company mentions, and IPTC/IAB/NAICS/SIC codes. Use " +
            "it when a news search result is not enough and you need full " +
            "context, deal details, or source verification.",
        docsUrl: "https://agent-docs.akta.pro/api-reference/news-detail",
        categories: ["company-news", "news-search"],
    },
    request: { method: "GET", path: "/v1/news/by-id/" },
    input: { schema: { queryParams: zNewsByIdQueryParams } },
    usage: {
        /** Same card as news: "0.1 per API call, 0.01 per news article"
         *  (agent-docs pricing, "News Details"). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    consumes: { credit: "default", amount: 0.1 },
                },
                article: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "articles",
                    consumes: { credit: "default", amount: 0.01 },
                },
            },
        },
        /** One article per requested id — the most the call can return. */
        estimate: ({ data }) => ({
            counts: { "article": data.input.queryParams.news_ids.length },
        }),
    },
});
