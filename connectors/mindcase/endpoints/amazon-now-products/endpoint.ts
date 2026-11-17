import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonNowProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `amazon-now/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Now Products",
        summary: "Live product data from Amazon Now, India's Amazon " +
            "quick-commerce service - search, browse a category, or fetch " +
            "specific products, for the dark store serving...",
        description: "Live product data from Amazon Now, India's Amazon " +
            "quick-commerce service - search, browse a category, or fetch " +
            "specific products, for the dark store serving the pincode " +
            "you name. Returns one row per product with productName, " +
            "brand, variantId, productId, price, mrp, discount, packSize, " +
            "inStock, stockCount, rating, ratingCount, category, rank, " +
            "sponsored, images, productUrl, description, countryOfOrigin, " +
            "manufacturer, seller, specifications, storeId, latitude, " +
            "longitude. Call it by search (query), category (category, " +
            "sub_category) or product urls (urls). $0.001 per product; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/amazon-now/products",
        categories: ["amazon-now", "quick-commerce"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "Requires a delivery location - a pincode or city, or lat and " +
            "lon. Amazon Now binds the store from a PINCODE, so a pincode " +
            "is the only exact input; city and coordinates are snapped to " +
            "one.",
            "`lat` must be sent together with `lon`.",
            "`lon` must be sent together with `lat`.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/amazon-now/products",
    request: { method: "POST", path: "/v1/data/amazon-now/products/run" },
    input: {
        schema: {
            body: zAmazonNowProductsBody.extend({
                maxResults: zAmazonNowProductsBody.shape.maxResults.unwrap()
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
