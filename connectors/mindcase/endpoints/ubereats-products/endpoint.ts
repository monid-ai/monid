import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zUbereatsProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `ubereats/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Uber Eats Products",
        summary: "Menu items from Uber Eats stores with name, price, " +
            "description, image and category. Search a delivery address " +
            "(with an optional keyword), or pass store URLs.",
        description: "Menu items from Uber Eats stores with name, price, " +
            "description, image and category. Search a delivery address " +
            "(with an optional keyword), or pass store URLs. Returns one " +
            "row per product with productId, productName, price, " +
            "currency, description, imageUrl, category, inStock, " +
            "hasOptions, likePercent, ratingCount, badges, storeId, " +
            "storeName, storeUrl, storeAddress, city, country, latitude, " +
            "longitude, cuisines, storeRating, storeRatingCount. Call it " +
            "by search (address) or url (urls). For store ratings and " +
            "cuisines use mindcase#ubereats/stores. $0.01 per product; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/ubereats/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/ubereats/products",
    request: { method: "POST", path: "/v1/data/ubereats/products/run" },
    input: {
        schema: {
            body: zUbereatsProductsBody.extend({
                maxResults: zUbereatsProductsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe(
                    "How many menu items to return in total.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
