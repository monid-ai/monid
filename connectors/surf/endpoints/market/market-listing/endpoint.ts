import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMarketListingQueryParams } from "./schema/inputs.ts";

/**
 * GET /market/listing — Standard tier, 2 Surf credits per call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Exchange Listing Events",
        summary: "Returns historical exchange listing and delisting events.",
        description: "Returns historical exchange listing and delisting " +
            "events from a required start date (from) to an optional end " +
            "date (to, default now). Filter by token symbol, exchange, " +
            "product (spot, margin, perp, pre_market_perp, or all by " +
            "default) and event type (listing by default; also delisting, " +
            "cancelled, advanced or postponed). Paginated: limit up to 100, " +
            "default 20; offset. For one project's TGE status and current " +
            "listing exchanges use /market/tge.",
        docsUrl: "https://docs.asksurf.ai/data-api/market/listing",
        categories: ["token-prices"],
    },
    request: { method: "GET", path: "/market/listing" },
    input: {
        schema: {
            // vendor defaults at the binding (D25); the mirror stays optional-only
            queryParams: zMarketListingQueryParams.extend({
                product: zMarketListingQueryParams.shape.product.unwrap()
                    .default("all"),
                type: zMarketListingQueryParams.shape.type.unwrap().default(
                    "listing",
                ),
                limit: zMarketListingQueryParams.shape.limit.unwrap().default(
                    20,
                ),
                offset: zMarketListingQueryParams.shape.offset.unwrap().default(
                    0,
                ),
            }),
        },
    },
    usage: {
        // Surf's published Standard tier — v1 makePerCallPrice(surfCredits(2)),
        // the balance-differencing drills of 2026-08 (design D1)
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
