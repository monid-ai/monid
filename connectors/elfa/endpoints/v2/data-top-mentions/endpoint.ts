import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV2DataTopMentionsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Top Mentions by Ticker (v2)",
        summary:
            "The most viewed X posts mentioning one ticker in a time window.",
        description:
            "The most significant X posts mentioning one ticker within a " +
            "time window (default 1h), ranked by views, then recency, " +
            "then relevance. Returns `{ success, data, metadata }`: " +
            "`data` is a flat list of posts and `metadata` holds `total`, " +
            "`page` and `pageSize`. Post text is not returned; each post " +
            "carries its `link`, engagement counts and `repostBreakdown` " +
            "(`smart` counts reposts by smart accounts, `ct` by " +
            "crypto-Twitter accounts). `mentionedAt` is an ISO 8601 " +
            "string. No author object is returned.",
        docsUrl: "https://docs.elfa.ai/api/v2/endpoints/top-mentions",
        categories: ["twitter", "crypto-signals"],
        notes: [
            "1 credit per request.",
        ],
    },
    request: { method: "GET", path: "/v2/data/top-mentions" },
    input: {
        schema: {
            queryParams: zV2DataTopMentionsQueryParams.extend({
                timeWindow: zV2DataTopMentionsQueryParams.shape.timeWindow
                    .unwrap().default("1h"),
                page: zV2DataTopMentionsQueryParams.shape.page.unwrap().default(
                    1,
                ),
                pageSize: zV2DataTopMentionsQueryParams.shape.pageSize.unwrap()
                    .default(10),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
