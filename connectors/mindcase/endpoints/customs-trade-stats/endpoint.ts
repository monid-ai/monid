import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCustomsTradeStatsBody } from "./schema/inputs.ts";

/**
 * Mindcase `customs/trade-stats`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Customs Trade Statistics",
        summary: "Ranks and value shares of customs trade aggregated by HS " +
            "code, origin country, destination country, or time period. " +
            "Covers customs filings and trade...",
        description:
            "Ranks and value shares of customs trade aggregated by HS " +
            "code, origin country, destination country, or time period. " +
            "Covers customs filings and trade statistics from about 95 " +
            "countries, including the United States, Mexico, Brazil, " +
            "Colombia, India, Indonesia, Vietnam, Pakistan, Russia, " +
            "Turkey, the UK and the EU. Returns one row per aggregate " +
            "bucket with bucketKey, groupBy, descriptionEn, countryCode, " +
            "countryName, period, weightKg, quantity, valueUsd, " +
            "unitPricePerKgUsd, unitPriceUsd, tradeCount, valueSharePct. " +
            "For the companies behind the trade use " +
            "mindcase#customs/companies; for individual shipments use " +
            "mindcase#customs/shipments. $0.035 per aggregate bucket; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/customs/trade-stats",
        categories: ["government-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/customs/trade-stats",
    request: { method: "POST", path: "/v1/data/customs/trade-stats/run" },
    input: {
        schema: {
            body: zCustomsTradeStatsBody.extend({
                maxResults: zCustomsTradeStatsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many aggregate buckets to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.035 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
