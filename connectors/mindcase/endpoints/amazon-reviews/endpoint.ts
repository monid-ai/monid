import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `amazon/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Reviews",
        summary:
            "Extract Amazon product reviews (ratings, text, verification, " +
            "helpful votes, and any attached photos/videos) from product " +
            "URLs or ASINs on any marketplace.",
        description:
            "Extract Amazon product reviews (ratings, text, verification, " +
            "helpful votes, and any attached photos/videos) from product " +
            "URLs or ASINs on any marketplace. Returns one row per review " +
            "with reviewTitle, reviewText, rating, posted, reviewer, " +
            "reviewerUrl, verifiedPurchase, amazonVine, helpfulVotes, " +
            "language, variant, variantAsin, images, videos, mediaType, " +
            "reviewUrl, reviewId, asin, country, productTitle, " +
            "productRating, productRatingsTotal, productReviewsTotal, " +
            "fiveStar, fourStar, threeStar, twoStar, oneStar, " +
            "productCategory. For full product detail pages use " +
            "mindcase#amazon/products. $0.0005 per review; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/amazon/reviews",
        categories: ["amazon"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/amazon/reviews",
    request: { method: "POST", path: "/v1/data/amazon/reviews/run" },
    input: {
        schema: {
            body: zAmazonReviewsBody.extend({
                maxResults: zAmazonReviewsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of reviews to return in total. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.urls.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = Math.min(body.maxResults, 100 * Math.max(1, capped));
            return { counts: { RESULT: rows } };
        },
    },
});
