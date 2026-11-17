import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEtsyListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `etsy/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Etsy Listings",
        summary: "Etsy listings with title, URL, price, list price, sale " +
            "status and currency. Search by keyword or pass search or " +
            "shop URLs.",
        description: "Etsy listings with title, URL, price, list price, sale " +
            "status and currency. Search by keyword or pass search or " +
            "shop URLs. Returns one row per listing with listingId, " +
            "title, listingUrl, price, listPrice, onSale, currency, " +
            "shopName, shopId, shopUrl, rating, reviewCount, favorites, " +
            "shopRating, shopReviewCount, shopSalesApprox, searchRank, " +
            "sponsored, bestseller, starSeller, freeShipping, isDigital, " +
            "isHandmade, isVintage, isPersonalizable, boughtLast24h, " +
            "category, material, shipsFrom, listedOn and 5 more fields. " +
            "Call it by search keywords (queries), search urls " +
            "(searchUrls) or shop urls (shopUrls). $0.007 per listing; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/etsy/listings",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/etsy/listings",
    request: { method: "POST", path: "/v1/data/etsy/listings/run" },
    input: {
        schema: {
            body: zEtsyListingsBody.extend({
                maxResults: zEtsyListingsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many listings to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.007 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
