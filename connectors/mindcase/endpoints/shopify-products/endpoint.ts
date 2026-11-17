import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zShopifyProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `shopify/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Shopify Products",
        summary: "Extract product data (prices, variants, images, " +
            "descriptions) from any Shopify-powered store URL.",
        description: "Extract product data (prices, variants, images, " +
            "descriptions) from any Shopify-powered store URL. Returns " +
            "one row per product with storeUrl, productUrl, productId, " +
            "title, brand, category, description, tags, currency, " +
            "priceFrom, priceTo, onSale, inStock, variantCount, variants, " +
            "options, imageUrl, media, createdDate, publishedDate, " +
            "recommendedProducts. $0.001 per product; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/shopify/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/shopify/products",
    request: { method: "POST", path: "/v1/data/shopify/products/run" },
    input: {
        schema: {
            body: zShopifyProductsBody.extend({
                maxResults: zShopifyProductsBody.shape.maxResults.unwrap().min(
                    1,
                ).describe(
                    "Number of products to return. Required, at least 1.",
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
