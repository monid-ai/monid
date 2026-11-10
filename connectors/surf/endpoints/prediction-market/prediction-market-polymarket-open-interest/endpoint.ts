import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPredictionMarketPolymarketOpenInterestQueryParams } from "./schema/inputs.ts";

/**
 * GET /prediction-market/polymarket/open-interest — Heavy tier, 4 Surf credits per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Polymarket Open Interest History",
        summary: "Daily open interest time series showing total value " +
            "locked in a Polymarket market.",
        description: "Daily open interest history (the total value locked) " +
            "for one Polymarket market, identified by its condition_id, over " +
            "a 7d, 30d (default), 90d, 180d or 1y window. Daily points only: " +
            "this endpoint takes time_range and does NOT accept interval. " +
            "Find a condition_id with /search/prediction-market. For trading " +
            "volume use /prediction-market/polymarket/volumes; for prices " +
            "use /prediction-market/polymarket/prices; for the same series " +
            "on Kalshi use /prediction-market/kalshi/open-interest. Data " +
            "refresh: ~30 minutes.",
        docsUrl:
            "https://docs.asksurf.ai/data-api/prediction-market/polymarket-open-interest",
        categories: ["prediction-markets"],
    },
    request: {
        method: "GET",
        path: "/prediction-market/polymarket/open-interest",
    },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zPredictionMarketPolymarketOpenInterestQueryParams
                .extend({
                    time_range:
                        zPredictionMarketPolymarketOpenInterestQueryParams.shape
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
