import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAliexpressProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `aliexpress/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "AliExpress Products",
        summary:
            "AliExpress product listings with title, URL, price, original " +
            "price, discount and currency. Search by keyword or pass " +
            "product URLs.",
        description:
            "AliExpress product listings with title, URL, price, original " +
            "price, discount and currency. Search by keyword or pass " +
            "product URLs. Returns one row per product with productId, " +
            "title, productUrl, price, originalPrice, discountPercent, " +
            "currency, rating, ordersCount, isChoice, isAd, mainImage, " +
            "images, categoryId, listedAt, searchQuery, searchRank, " +
            "region. Call it by search query (query) or url (url). For " +
            "review text use mindcase#aliexpress/reviews. $0.0035 per " +
            "product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/aliexpress/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/aliexpress/products",
    request: { method: "POST", path: "/v1/data/aliexpress/products/run" },
    input: {
        schema: {
            body: zAliexpressProductsBody.extend({
                maxResults: zAliexpressProductsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many products to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0035 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
