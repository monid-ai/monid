import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3MarketCryptoMindshareQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Crypto Mindshare",
        summary:
            "Crypto assets ranked by share of attention, weighted by who posted.",
        description:
            "Crypto assets ranked by share of attention over a period, " +
            "weighted by who posted. `hot` marks a name whose last hour " +
            "is running ahead of its last four, picked from the top 25; " +
            "it is null on the one-hour period.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/crypto-mindshare",
        categories: ["crypto-signals", "twitter"],
        notes: [
            "5 credits for `limit` up to 50, 10 up to 200.",
        ],
    },
    request: { method: "GET", path: "/v3/market/crypto/mindshare" },
    input: {
        schema: {
            queryParams: zV3MarketCryptoMindshareQueryParams.extend({
                limit: zV3MarketCryptoMindshareQueryParams.shape.limit.unwrap()
                    .default(50),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                up_to_50: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "page of up to 50",
                    description: "one request with limit up to 50",
                    consumes: { credit: "default", amount: 5 },
                },
                up_to_200: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "page of up to 200",
                    description: "one request with limit 51 to 200",
                    consumes: { credit: "default", amount: 10 },
                },
            },
        },
        estimate: ({ data }) => {
            const query = data.input.queryParams;
            const limit = query?.limit ?? 0;
            return {
                counts: {
                    up_to_50: limit <= 50 ? 1 : 0,
                    up_to_200: limit > 50 ? 1 : 0,
                },
            };
        },
        evidence: ({ data }) => {
            const query = data.input.queryParams;
            const limit = query?.limit ?? 0;
            return {
                counts: {
                    up_to_50: limit <= 50 ? 1 : 0,
                    up_to_200: limit > 50 ? 1 : 0,
                },
            };
        },
    },
});
