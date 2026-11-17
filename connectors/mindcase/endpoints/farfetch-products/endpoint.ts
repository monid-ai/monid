import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFarfetchProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `farfetch/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Farfetch Products",
        summary: "Farfetch product detail: price, discount, per-size " +
            "availability, seller boutique and category. One row per " +
            "product, from a designer or product URL.",
        description: "Farfetch product detail: price, discount, per-size " +
            "availability, seller boutique and category. One row per " +
            "product, from a designer or product URL. Returns one row per " +
            "product with productId, productName, brand, productUrl, " +
            "description, color, category, categoryPath, gender, season, " +
            "price, fullPrice, discountPercent, currency, seller, sizes, " +
            "variants, measurements, returns, stockQuantity, " +
            "availability, label, condition, images. Call it by listing " +
            "url (listing_url), search (query) or product url (urls). " +
            "$0.001 per product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/farfetch/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/farfetch/products",
    request: { method: "POST", path: "/v1/data/farfetch/products/run" },
    input: {
        schema: {
            body: zFarfetchProductsBody.extend({
                maxResults: zFarfetchProductsBody.shape.maxResults.unwrap().min(
                    1,
                ).describe(
                    "Number of products to return from a listing page. Ignored when you pass product URLs. Required, at least 1.",
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
                (body.listing_url ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length +
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
