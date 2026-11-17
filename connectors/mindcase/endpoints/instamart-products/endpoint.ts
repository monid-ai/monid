import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstamartProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `instamart/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instamart Products",
        summary: "Instamart products by search, category or product URL(s): " +
            "prices, MRP, stock, ratings, rank, images and product " +
            "details.",
        description:
            "Instamart products by search, category or product URL(s): " +
            "prices, MRP, stock, ratings, rank, images and product " +
            "details. Returns one row per product with productName, " +
            "brand, variantId, productId, price, mrp, discount, packSize, " +
            "inStock, stockCount, rating, ratingCount, category, rank, " +
            "sponsored, images, productUrl, description, countryOfOrigin, " +
            "manufacturer, seller, specifications, storeId, latitude, " +
            "longitude. Search by query, browse a category and " +
            "sub-category, or fetch one or more specific product URLs. " +
            "Same record shape as mindcase#blinkit/products and " +
            "mindcase#zepto/products, so the three can be compared row " +
            "for row. $0.001 per product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instamart/products",
        categories: ["instamart", "quick-commerce"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "Requires a store to look in: pick a city, pincode and store " +
            "(Store), or send lat and lon (Coordinates).",
            "`lat` must be sent together with `lon`.",
            "`lon` must be sent together with `lat`.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/instamart/products",
    request: { method: "POST", path: "/v1/data/instamart/products/run" },
    input: {
        schema: {
            body: zInstamartProductsBody.extend({
                maxResults: zInstamartProductsBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "How many products to return. Required, at least 1.",
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
            const capped =
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.urls?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
