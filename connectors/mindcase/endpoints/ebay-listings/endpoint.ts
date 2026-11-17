import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEbayListingsBody } from "./schema/inputs.ts";

/**
 * Mindcase `ebay/listings`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "eBay Listings",
        summary: "eBay listings with title, item URL, marketplace, search " +
            "rank, price and currency. Search by keyword or pass listing " +
            "URLs.",
        description:
            "eBay listings with title, item URL, marketplace, search " +
            "rank, price and currency. Search by keyword or pass listing " +
            "URLs. Returns one row per listing with itemId, title, " +
            "itemUrl, marketplace, searchRank, price, currency, " +
            "listPrice, discount, shippingPrice, shippingText, condition, " +
            "listingType, buyItNowAvailable, bestOfferAvailable, " +
            "bidCount, auctionEnds, quantityAvailable, watchCount, " +
            "categoryId, categoryName, itemLocation, rating, " +
            "ratingsCount, sellerName, sellerFeedbackScore, " +
            "sellerFeedbackPercent, sellerIsStore, sponsored, freeReturns " +
            "and 3 more fields. Call it by search keywords (queries) or " +
            "urls (urls). For what items actually sold for use " +
            "mindcase#ebay/sold. $0.01 per listing; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ebay/listings",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ebay/listings",
    request: { method: "POST", path: "/v1/data/ebay/listings/run" },
    input: {
        schema: {
            body: zEbayListingsBody.extend({
                maxResults: zEbayListingsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
