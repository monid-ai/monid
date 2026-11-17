import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTargetProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `target/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Target Products",
        summary: "Target products with title, brand, URL, price and list " +
            "price. Search by keyword or pass product URLs.",
        description: "Target products with title, brand, URL, price and list " +
            "price. Search by keyword or pass product URLs. Returns one " +
            "row per product with tcin, title, brand, productUrl, price, " +
            "currency, listPrice, priceLabel, priceType, unitPrice, " +
            "unitPriceUnit, promotions, rating, ratingsCount, " +
            "ratingDistribution, availability, soldOut, " +
            "outOfStockInAllStores, pickupAvailability, pickupStoreId, " +
            "pickupStoreName, pickupQuantity, " +
            "scheduledDeliveryAvailability, shipsBy, mainImage, images, " +
            "dpci, upc, itemType, departmentId and 7 more fields. Call it " +
            "by search keywords (queries) or product urls (productUrls). " +
            "$0.002 per product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/target/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/target/products",
    request: { method: "POST", path: "/v1/data/target/products/run" },
    input: {
        schema: {
            body: zTargetProductsBody.extend({
                maxResults: zTargetProductsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
