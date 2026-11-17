import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoatProductsBody } from "./schema/inputs.ts";

/**
 * Mindcase `goat/products`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "GOAT Products",
        summary: "Full GOAT product detail (every size, its asking price and " +
            "availability), one row per product, from a search, a brand " +
            "page or a product URL.",
        description:
            "Full GOAT product detail (every size, its asking price and " +
            "availability), one row per product, from a search, a brand " +
            "page or a product URL. Returns one row per product with " +
            "productId, productName, sku, productUrl, brand, colorway, " +
            "color, category, subcategory, categoryLevel3, " +
            "categoryLevel4, activities, gender, releaseDate, season, " +
            "story, styleTags, detailTags, merchandisingTags, " +
            "specialType, isResellable, directShipping, maxOffer, " +
            "sizeType, sizeUnit, retailPrice, images, attributes, " +
            "listings. Call it by listing url (listing_url), search " +
            "(query) or product url (urls). $0.001 per product; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/goat/products",
        categories: ["ecommerce"],
        notes: [
            "`maxResults` does not apply to `urls`: those return one row " +
            "per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/goat/products",
    request: { method: "POST", path: "/v1/data/goat/products/run" },
    input: {
        schema: {
            body: zGoatProductsBody.extend({
                maxResults: zGoatProductsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of products to return from a search or brand page. Ignored when you pass product URLs. Required, at least 1.",
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
