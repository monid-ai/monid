import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zIkeaProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `ikea/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "IKEA Products",
        summary:
            "Extract IKEA products from any country: article number, name " +
            "and type, current and previous price, rating, colour, " +
            "measurements, category, variants and...",
        description:
            "Extract IKEA products from any country: article number, name " +
            "and type, current and previous price, rating, colour, " +
            "measurements, category, variants and national plus per-store " +
            "stock. Returns one row per product with productUrl, " +
            "productId, productName, productType, country, price, " +
            "currency, listPrice, onSale, priceTag, rating, ratingCount, " +
            "inStock, onlineSellable, color, measurements, categoryPath, " +
            "badge, isNewArrival, lastChance, variantCount, mainImage, " +
            "images, variants, availability. Call it by url (urls) or " +
            "keyword (queries). $0.0045 per product; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ikea/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ikea/products",
    request: { method: "POST", path: "/v1/data/ikea/products/run" },
    input: {
        schema: {
            body: zIkeaProductsBody.extend({
                maxResults: zIkeaProductsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
