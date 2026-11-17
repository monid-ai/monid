import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWalmartProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `walmart/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Walmart Products",
        summary: "Walmart products with title, brand, URL, price and list " +
            "price. Search by keyword or pass product URLs.",
        description:
            "Walmart products with title, brand, URL, price and list " +
            "price. Search by keyword or pass product URLs. Returns one " +
            "row per product with itemId, title, brand, productUrl, " +
            "price, currency, listPrice, savings, priceRangeMin, " +
            "priceRangeMax, unitPrice, availability, inStock, rating, " +
            "ratingsCount, ratingCounts, boughtSinceYesterday, " +
            "isBestSeller, soldBy, sellerId, soldByWalmart, " +
            "fulfillmentType, additionalOfferCount, searchRank, " +
            "categoryPath, upc, model, condition, description, mainImage " +
            "and 6 more fields. Call it by search keywords (queries) or " +
            "urls (urls). $0.0025 per product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/walmart/products",
        categories: ["walmart", "ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/walmart/products",
    request: { method: "POST", path: "/v1/data/walmart/products/run" },
    input: {
        schema: {
            body: zWalmartProductsBody.extend({
                maxResults: zWalmartProductsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe(
                    "How many products to return in total.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
