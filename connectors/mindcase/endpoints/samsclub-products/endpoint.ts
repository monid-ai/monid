import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSamsclubProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `samsclub/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Sam's Club Products",
        summary: "Sam's Club products with title, brand, URL, price and list " +
            "price. Search by keyword or pass product URLs.",
        description:
            "Sam's Club products with title, brand, URL, price and list " +
            "price. Search by keyword or pass product URLs. Returns one " +
            "row per product with itemId, title, brand, productUrl, " +
            "price, currency, listPrice, availability, inStock, " +
            "stockLevel, orderLimit, preOrder, rating, ratingsCount, " +
            "categoryPath, arrivesBy, mainImage, searchTerm. Call it by " +
            "search query (query) or product urls (productUrls). $0.0015 " +
            "per product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/samsclub/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/samsclub/products",
    request: { method: "POST", path: "/v1/data/samsclub/products/run" },
    input: {
        schema: {
            body: zSamsclubProductsBody.extend({
                maxResults: zSamsclubProductsBody.shape.maxResults.unwrap().min(
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
            consumes: { credit: "default", amount: 0.0015 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
