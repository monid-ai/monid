import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFlipkartMinutesProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `flipkart-minutes/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Flipkart Minutes Products",
        summary: "Live product data from Flipkart Minutes - search, browse a " +
            "category, or fetch specific product URLs, for the store " +
            "serving any Indian pincode.",
        description:
            "Live product data from Flipkart Minutes - search, browse a " +
            "category, or fetch specific product URLs, for the store " +
            "serving any Indian pincode. Returns one row per product with " +
            "productName, brand, variantId, productId, price, mrp, " +
            "discount, packSize, inStock, stockCount, rating, " +
            "ratingCount, category, rank, sponsored, images, productUrl, " +
            "description, countryOfOrigin, manufacturer, seller, " +
            "specifications, storeId, latitude, longitude. A search " +
            "query, a category + sub-category, or product URLs - plus a " +
            "pincode, city or lat/lon. $0.001 per product; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/flipkart-minutes/products",
        categories: ["flipkart-minutes", "quick-commerce"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "Requires a location to look in - a pincode or city (Store), " +
            "or lat and lon (Coordinates).",
            "`lat` must be sent together with `lon`.",
            "`lon` must be sent together with `lat`.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/flipkart-minutes/products",
    request: { method: "POST", path: "/v1/data/flipkart-minutes/products/run" },
    input: {
        schema: {
            body: zFlipkartMinutesProductsBody.extend({
                maxResults: zFlipkartMinutesProductsBody.shape.maxResults
                    .unwrap().min(1).describe(
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
