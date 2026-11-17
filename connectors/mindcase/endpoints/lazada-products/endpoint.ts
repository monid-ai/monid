import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLazadaProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `lazada/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Lazada Products",
        summary: "Lazada products with title, URL, marketplace, price, list " +
            "price and currency. Search by keyword or country.",
        description:
            "Lazada products with title, URL, marketplace, price, list " +
            "price and currency. Search by keyword or country. Returns " +
            "one row per product with productId, title, productUrl, " +
            "marketplace, price, currency, listPrice, discountPercent, " +
            "rating, ratingsCount, soldCount, soldBy, sellerId, " +
            "sellerLocation, brand, inStock, searchRank, skuId, " +
            "mainImage. $0.0025 per product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/lazada/products",
        categories: ["lazada", "ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/lazada/products",
    request: { method: "POST", path: "/v1/data/lazada/products/run" },
    input: {
        schema: {
            body: zLazadaProductsBody.extend({
                maxResults: zLazadaProductsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
