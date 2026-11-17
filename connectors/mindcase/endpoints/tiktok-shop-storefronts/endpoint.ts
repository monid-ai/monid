import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokShopStorefrontsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok-shop/storefronts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Shop Storefronts",
        summary: "Products from TikTok Shop storefronts with title, URL, " +
            "image, seller, sale price and original price. Pass the store " +
            "URLs.",
        description: "Products from TikTok Shop storefronts with title, URL, " +
            "image, seller, sale price and original price. Pass the store " +
            "URLs. Returns one row per storefront with productId, title, " +
            "productUrl, image, seller, salePrice, originalPrice, " +
            "discount, currency, rating, reviewCount, soldCount, " +
            "priceMin, priceMax, variantCount, freeShipping, brand, " +
            "position, region. For products across all shops by keyword " +
            "use mindcase#tiktok/shop; for review text use " +
            "mindcase#tiktok-shop/reviews. $0.0035 per storefront; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok-shop/storefronts",
        categories: ["tiktok-shop"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tiktok-shop/storefronts",
    request: { method: "POST", path: "/v1/data/tiktok-shop/storefronts/run" },
    input: {
        schema: {
            body: zTiktokShopStorefrontsBody.extend({
                maxResults: zTiktokShopStorefrontsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many storefronts to return in total.",
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
