import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV2AggregationsTrendingCasTwitterQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Trending Contract Addresses on X (v2)",
        summary: "Contract addresses ranked by mentions on X.",
        description:
            "Contract addresses mentioned on X, ranked by mention count " +
            "over a time window (default 7d), keeping those at or above a " +
            "minimum. `from` and `to` together override `timeWindow`. For " +
            "X and Telegram counted together and named where known, use " +
            "elfa#v3/market/crypto/trending-contracts.",
        docsUrl: "https://docs.elfa.ai/api/v2/endpoints/trending-cas-twitter",
        categories: ["crypto-signals", "twitter"],
        notes: [
            "1 credit per request.",
        ],
    },
    request: { method: "GET", path: "/v2/aggregations/trending-cas/twitter" },
    input: {
        schema: {
            queryParams: zV2AggregationsTrendingCasTwitterQueryParams.extend({
                timeWindow: zV2AggregationsTrendingCasTwitterQueryParams.shape
                    .timeWindow.unwrap().default("7d"),
                page: zV2AggregationsTrendingCasTwitterQueryParams.shape.page
                    .unwrap().default(1),
                pageSize: zV2AggregationsTrendingCasTwitterQueryParams.shape
                    .pageSize.unwrap().default(50),
                minMentions: zV2AggregationsTrendingCasTwitterQueryParams.shape
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
