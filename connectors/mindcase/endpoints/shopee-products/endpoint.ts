import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zShopeeProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `shopee/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Shopee Products",
        summary: "Shopee products with title, price, original price and " +
            "discount. Search by keyword or country.",
        description: "Shopee products with title, price, original price and " +
            "discount. Search by keyword or country. Returns one row per " +
            "product with productUrl, itemId, shopId, title, price, " +
            "originalPrice, discountPercent, currency, country, rating, " +
            "ratingsCount, location, shopName, shopUrl, shopRating, " +
            "shopRatingsCount, labels, image, searchRank. $0.001 per " +
            "product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/shopee/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/shopee/products",
    request: { method: "POST", path: "/v1/data/shopee/products/run" },
    input: {
        schema: {
            body: zShopeeProductsBody.extend({
                maxResults: zShopeeProductsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many products to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
