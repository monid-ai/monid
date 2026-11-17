import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBestbuyProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `bestbuy/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Best Buy Products",
        summary: "Best Buy products with title, brand, model, UPC, URL and " +
            "price. Search by keyword or pass product URLs.",
        description:
            "Best Buy products with title, brand, model, UPC, URL and " +
            "price. Search by keyword or pass product URLs. Returns one " +
            "row per product with sku, title, brand, model, upc, " +
            "productUrl, price, currency, listPrice, savings, " +
            "savingsPercent, onSale, condition, availability, inStock, " +
            "rating, reviewCount, searchRank, isSponsored, sellerType, " +
            "soldByBestBuy, openBoxLowestPrice, openBoxOffers, " +
            "financeMonthly, financeMonths, isNewArrival, badges, " +
            "categoryPath, mainImage, images and 4 more fields. Call it " +
            "by search query (searchQuery) or urls (urls). $0.004 per " +
            "product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/bestbuy/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/bestbuy/products",
    request: { method: "POST", path: "/v1/data/bestbuy/products/run" },
    input: {
        schema: {
            body: zBestbuyProductsBody.extend({
                maxResults: zBestbuyProductsBody.shape.maxResults.unwrap().min(
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
            consumes: { credit: "default", amount: 0.004 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
