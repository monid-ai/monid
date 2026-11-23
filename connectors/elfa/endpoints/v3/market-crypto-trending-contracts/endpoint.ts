import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zV3MarketCryptoTrendingContractsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Trending Contracts",
        summary:
            "Contract addresses pasted on X and Telegram, counted together and named where known.",
        description:
            "Contract addresses being pasted on X and Telegram, counted " +
            "together, named where Elfa knows the token. An address " +
            "several tokens share across chains is named for the one on " +
            "its home chain, the same order elfa#v3/entities ranks by, " +
            "and left unnamed when the home chains do not pick out " +
            "exactly one.",
        docsUrl: "https://docs.elfa.ai/api/v3/endpoints/trending-contracts",
        categories: ["crypto-signals", "twitter"],
        notes: [
            "5 credits for `limit` up to 50, 10 up to 200, plus 5 when " +
            "the range is over 24 hours.",
            "Without `to`, the hold assumes the range is over 24 hours; " +
            "the charge Elfa reports settles the call.",
        ],
    },
    request: { method: "GET", path: "/v3/market/crypto/trending-contracts" },
    input: {
        schema: {
            queryParams: zV3MarketCryptoTrendingContractsQueryParams.extend({
                limit: zV3MarketCryptoTrendingContractsQueryParams.shape.limit
                    .unwrap().default(50),
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
                long_range: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "range over 24 hours",
                    description:
                        "surcharge when to - from exceeds 24 hours and 5 minutes",
                    consumes: { credit: "default", amount: 5 },
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
                    long_range: query?.to === undefined ||
                            query.to - query.from > 86_700
                        ? 1
                        : 0,
                },
            };
        },
        evidence: ({ data, utils }) => {
            const query = data.input.queryParams;
            const limit = query?.limit ?? 0;
            const window = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.window",
            );
            return {
                counts: {
                    up_to_50: limit <= 50 ? 1 : 0,
                    up_to_200: limit > 50 ? 1 : 0,
                    long_range: typeof window === "number"
                        ? window > 0 ? 1 : 0
                        : query?.to !== undefined &&
                                query.to - query.from > 86_700
                        ? 1
                        : 0,
                },
            };
        },
    },
});
