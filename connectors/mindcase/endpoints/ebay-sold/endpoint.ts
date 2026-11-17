import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEbaySoldBody } from "./schema/inputs.ts";

/**
 * Mindcase `ebay/sold`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "eBay Sold Items",
        summary: "Get recent sold eBay listings for any product search: what " +
            "each item actually sold for, the buyer protection fee and " +
            "shipping where shown, the total, the...",
        description:
            "Get recent sold eBay listings for any product search: what " +
            "each item actually sold for, the buyer protection fee and " +
            "shipping where shown, the total, the sold date, condition, " +
            "sale type and the seller, on 17 eBay marketplaces. Returns " +
            "one row per listing with itemId, title, url, marketplace, " +
            "soldPrice, currency, buyerProtectionFee, shippingPrice, " +
            "totalPrice, soldDate, condition, listingType, " +
            "bestOfferAccepted, bidCount, categoryId, categoryName, " +
            "itemLocation, sellerType, mainImage, seller. For live " +
            "listings currently for sale use mindcase#ebay/listings. " +
            "$0.01 per listing; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ebay/sold",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ebay/sold",
    request: { method: "POST", path: "/v1/data/ebay/sold/run" },
    input: {
        schema: {
            body: zEbaySoldBody.extend({
                maxResults: zEbaySoldBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many sold listings to return in total.",
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
