import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAliexpressReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `aliexpress/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "AliExpress Reviews",
        summary: "AliExpress product reviews with rating, review text, an " +
            "English translation and posted date. Pass the product URLs " +
            "to review.",
        description:
            "AliExpress product reviews with rating, review text, an " +
            "English translation and posted date. Pass the product URLs " +
            "to review. Returns one row per review with reviewId, " +
            "productId, productUrl, rating, reviewText, translatedText, " +
            "postedDate, reviewerName, reviewerCountry, variant, skuId, " +
            "photos, helpfulVotes, unhelpfulVotes, shippingMethod, " +
            "subratings, followUpText, followUpTranslated, followUpDate, " +
            "aiGenerated, featured. To find products and their URLs first " +
            "use mindcase#aliexpress/products. $0.006 per review; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/aliexpress/reviews",
        categories: ["ecommerce"],
        notes: [
            "`maxReviewsPerProduct` caps rows per input, so a run can " +
            "return up to that many rows for each `productUrls` entry.",
            "`maxReviewsPerProduct` must be at least 1 here; the raw API " +
            "reads 0 or blank as unlimited, which cannot be priced up " +
            "front.",
        ],
    },
    endpoint: "/aliexpress/reviews",
    request: { method: "POST", path: "/v1/data/aliexpress/reviews/run" },
    input: {
        schema: {
            body: zAliexpressReviewsBody.extend({
                maxReviewsPerProduct: zAliexpressReviewsBody.shape
                    .maxReviewsPerProduct.unwrap().min(1).default(100).describe(
                        "Most reviews to return from each product.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.006 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.productUrls.length;
            const rows = body.maxReviewsPerProduct * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
