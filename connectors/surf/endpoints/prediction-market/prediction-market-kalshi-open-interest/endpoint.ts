import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPredictionMarketKalshiOpenInterestQueryParams } from "./schema/inputs.ts";

/**
 * GET /prediction-market/kalshi/open-interest — Heavy tier, 4 Surf credits per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Kalshi Open Interest History",
        summary: "Daily open interest time series for a Kalshi market.",
        description: "Daily open interest history for one Kalshi market, " +
            "identified by its ticker, over a 7d, 30d (default), 90d, 180d " +
            "or 1y window. Daily points only: this endpoint takes time_range " +
            "and does NOT accept interval. Find a ticker with " +
            "/prediction-market/kalshi/markets or " +
            "/search/prediction-market?platform=kalshi. For daily trading " +
            "volume use /prediction-market/kalshi/volumes; for price history " +
            "use /prediction-market/kalshi/prices; for the same series on " +
            "Polymarket use /prediction-market/polymarket/open-interest. " +
            "Data refresh: ~30 minutes.",
        docsUrl:
            "https://docs.asksurf.ai/data-api/prediction-market/kalshi-open-interest",
        categories: ["prediction-markets"],
    },
    request: { method: "GET", path: "/prediction-market/kalshi/open-interest" },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zPredictionMarketKalshiOpenInterestQueryParams.extend({
                time_range: zPredictionMarketKalshiOpenInterestQueryParams.shape
                    .time_range.unwrap().default("30d"),
            }),
        },
    },
    usage: {
        // Surf's published Heavy tier — v1 makePerCallPrice(surfCredits(4)),
        // the balance-differencing drills of 2026-08 (design D1)
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 4 },
        },
    },
});
