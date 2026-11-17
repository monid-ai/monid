import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPredictionMarketKalshiVolumesQueryParams } from "./schema/inputs.ts";

/**
 * GET /prediction-market/kalshi/volumes — Heavy tier, 4 Surf credits per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Kalshi Volume History",
        summary: "Daily trading volume time series for a Kalshi market.",
        description: "Daily trading volume history for one Kalshi market, " +
            "identified by its ticker, over a 7d, 30d (default), 90d, 180d " +
            "or 1y window. Daily points only: this endpoint takes time_range " +
            "and does NOT accept interval. Find a ticker with " +
            "/prediction-market/kalshi/markets or " +
            "/search/prediction-market?platform=kalshi. For open interest " +
            "use /prediction-market/kalshi/open-interest; for price history " +
            "use /prediction-market/kalshi/prices; for Polymarket volume use " +
            "/prediction-market/polymarket/volumes. Data refresh: ~30 " +
            "minutes.",
        docsUrl:
            "https://docs.asksurf.ai/data-api/prediction-market/kalshi-volumes",
        categories: ["prediction-markets"],
    },
    request: { method: "GET", path: "/prediction-market/kalshi/volumes" },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zPredictionMarketKalshiVolumesQueryParams.extend({
                time_range: zPredictionMarketKalshiVolumesQueryParams.shape
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
