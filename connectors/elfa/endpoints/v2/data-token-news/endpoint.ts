import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zV2DataTokenNewsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Token News Posts (v2)",
        summary: "Token news posted on X by accounts tagged as news sources.",
        description:
            "Token news from X: posts by accounts tagged as news sources, " +
            "not articles from news outlets. Filter by CoinGecko coin ids " +
            "(comma-separated) and a time window (default 7d). For " +
            "analyzed news events per asset, use elfa#v3/events.",
        docsUrl: "https://docs.elfa.ai/api/v2/endpoints/token-news",
        categories: ["news-search", "crypto-signals"],
        notes: [
            "1 credit per request.",
        ],
    },
    request: { method: "GET", path: "/v2/data/token-news" },
    input: {
        schema: {
            queryParams: zV2DataTokenNewsQueryParams.extend({
                timeWindow: zV2DataTokenNewsQueryParams.shape.timeWindow
                    .unwrap().default("7d"),
                page: zV2DataTokenNewsQueryParams.shape.page.unwrap().default(
                    1,
                ),
                pageSize: zV2DataTokenNewsQueryParams.shape.pageSize.unwrap()
                    .default(20),
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
