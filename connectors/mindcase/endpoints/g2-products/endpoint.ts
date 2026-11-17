import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zG2ProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `g2/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "G2 Products",
        summary: "Get G2 products with product name, product slug, product " +
            "url, vendor name, rating, review count, by search keywords " +
            "or categorys.",
        description:
            "Get G2 products with product name, product slug, product " +
            "url, vendor name, rating, review count, by search keywords " +
            "or categorys. Returns one row per product with productId, " +
            "productName, productSlug, productUrl, vendorName, rating, " +
            "reviewCount, categories, description, logoUrl, rank, query. " +
            "Call it by search keywords (queries) or categorys " +
            "(categorys). For review text use mindcase#g2/reviews; for " +
            "Capterra reviews use mindcase#capterra/reviews; for Gartner " +
            "Peer Insights use mindcase#gartner/reviews. $0.004 per " +
            "product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/g2/products",
        categories: ["company-reviews"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/g2/products",
    request: { method: "POST", path: "/v1/data/g2/products/run" },
    input: {
        schema: {
            body: zG2ProductsBody.extend({
                maxResults: zG2ProductsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.004 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
