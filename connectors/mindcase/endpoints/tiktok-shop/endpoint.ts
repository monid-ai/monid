import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokShopBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/shop`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Shop",
        summary: "TikTok Shop products by keyword: title, price, discount, " +
            "seller, rating, sold count, promo labels, description, and " +
            "every variant with its stock.",
        description:
            "TikTok Shop products by keyword: title, price, discount, " +
            "seller, rating, sold count, promo labels, description, and " +
            "every variant with its stock. Returns one row per product " +
            "with title, productUrl, image, seller, salePrice, " +
            "originalPrice, discount, currency, rating, reviewCount, " +
            "soldCount, labels, description, variants, productId. For one " +
            "shop's catalogue use mindcase#tiktok-shop/storefronts; for " +
            "review text use mindcase#tiktok-shop/reviews. $0.015 per " +
            "product; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/shop",
        categories: ["tiktok-shop"],
        notes: [
            "`productsPerSearch` caps rows per input, so a run can return " +
            "up to that many rows for each `keywords` entry.",
            "`productsPerSearch` must be at least 1 here; the raw API " +
            "reads 0 or blank as unlimited, which cannot be priced up " +
            "front.",
        ],
    },
    endpoint: "/tiktok/shop",
    request: { method: "POST", path: "/v1/data/tiktok/shop/run" },
    input: {
        schema: {
            body: zTiktokShopBody.extend({
                productsPerSearch: zTiktokShopBody.shape.productsPerSearch
                    .unwrap().min(1).describe(
                        "Number of products to return. Capped at 10,000 per search. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.015 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.keywords.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = body.productsPerSearch * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
