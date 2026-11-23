import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV2AggregationsTrendingTokensQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Trending Tokens (v2)",
        summary: "Tokens ranked by X mention count over a time window.",
        description:
            "Tokens ranked by how many X posts mention them over a time " +
            "window, keeping those at or above a minimum mention count. " +
            "`timeWindow` defaults to 7d; `from` and `to` together " +
            "override it. Experimental: the ranking may change without " +
            "notice. For attention weighted by who posted, use " +
            "elfa#v3/market/crypto/mindshare.",
        docsUrl: "https://docs.elfa.ai/api/v2/endpoints/trending-tokens",
        categories: ["crypto-signals", "twitter"],
        notes: [
            "1 credit per request.",
        ],
    },
    request: { method: "GET", path: "/v2/aggregations/trending-tokens" },
    input: {
        schema: {
            queryParams: zV2AggregationsTrendingTokensQueryParams.extend({
                timeWindow: zV2AggregationsTrendingTokensQueryParams.shape
                    .timeWindow.unwrap().default("7d"),
                page: zV2AggregationsTrendingTokensQueryParams.shape.page
                    .unwrap().default(1),
                pageSize: zV2AggregationsTrendingTokensQueryParams.shape
                    .pageSize.unwrap().default(50),
                minMentions: zV2AggregationsTrendingTokensQueryParams.shape
                    .minMentions.unwrap().default(5),
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
