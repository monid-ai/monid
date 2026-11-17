import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAsosProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `asos/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "ASOS Products",
        summary: "ASOS products from any of 11 country stores: today's price " +
            "and pre-sale price in the store currency, sizes in stock " +
            "with per-size SKU and EAN, description...",
        description:
            "ASOS products from any of 11 country stores: today's price " +
            "and pre-sale price in the store currency, sizes in stock " +
            "with per-size SKU and EAN, description, materials, rating " +
            "and images. One row per product, from a keyword, an ASOS " +
            "category or an ASOS search or category page URL. Returns one " +
            "row per product with productId, productName, brand, " +
            "productUrl, productCode, price, fullPrice, discountPercent, " +
            "currency, color, sizes, variants, images, description, " +
            "materials, gender, fitType, rating, reviewCount, " +
            "sellingFast, isNew. Call it by search (query), category " +
            "(category) or asos url (listing_url). $0.0105 per product; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/asos/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/asos/products",
    request: { method: "POST", path: "/v1/data/asos/products/run" },
    input: {
        schema: {
            body: zAsosProductsBody.extend({
                maxResults: zAsosProductsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0105 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
