import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV2AggregationsTrendingCasTelegramQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Trending Contract Addresses on Telegram (v2)",
        summary: "Contract addresses ranked by mentions in Telegram channels.",
        description:
            "Contract addresses mentioned in Telegram channels, ranked by " +
            "mention count over a time window (default 7d), keeping those " +
            "at or above a minimum. `from` and `to` together override " +
            "`timeWindow`. For X and Telegram counted together and named " +
            "where known, use elfa#v3/market/crypto/trending-contracts.",
        docsUrl: "https://docs.elfa.ai/api/v2/endpoints/trending-cas-telegram",
        categories: ["crypto-signals"],
        notes: [
            "1 credit per request.",
        ],
    },
    request: { method: "GET", path: "/v2/aggregations/trending-cas/telegram" },
    input: {
        schema: {
            queryParams: zV2AggregationsTrendingCasTelegramQueryParams.extend({
                timeWindow: zV2AggregationsTrendingCasTelegramQueryParams.shape
                    .timeWindow.unwrap().default("7d"),
                page: zV2AggregationsTrendingCasTelegramQueryParams.shape.page
                    .unwrap().default(1),
                pageSize: zV2AggregationsTrendingCasTelegramQueryParams.shape
                    .pageSize.unwrap().default(50),
                minMentions: zV2AggregationsTrendingCasTelegramQueryParams.shape
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
