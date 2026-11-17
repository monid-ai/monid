import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAutozoneProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `autozone/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "AutoZone Products",
        summary:
            "AutoZone auto parts with title, brand, part number, product " +
            "URL and main image. Pass AutoZone product or search URLs.",
        description:
            "AutoZone auto parts with title, brand, part number, product " +
            "URL and main image. Pass AutoZone product or search URLs. " +
            "Returns one row per product with skuId, title, brand, " +
            "subBrand, partNumber, productUrl, mainImage, rating, " +
            "ratingsCount, recommendPercentage, searchRank, categoryName, " +
            "categoryPath, location, vehicleFitment, warrantyType, " +
            "sponsored, attributes. $0.002 per product; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/autozone/products",
        categories: ["autozone", "ecommerce"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/autozone/products",
    request: { method: "POST", path: "/v1/data/autozone/products/run" },
    input: {
        schema: {
            body: zAutozoneProductsBody.extend({
                maxResults: zAutozoneProductsBody.shape.maxResults.unwrap().min(
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
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
