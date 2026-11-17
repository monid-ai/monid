import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zG2ReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `g2/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "G2 Reviews",
        summary: "Extract G2 software reviews for any product: star rating, " +
            "title, what the reviewer liked and disliked, full text, " +
            "reviewer role and company size, newest first.",
        description:
            "Extract G2 software reviews for any product: star rating, " +
            "title, what the reviewer liked and disliked, full text, " +
            "reviewer role and company size, newest first. Returns one " +
            "row per review with reviewId, reviewUrl, productName, " +
            "productSlug, productId, rating, reviewTitle, postedDate, " +
            "updatedDate, liked, disliked, reviewText, reviewerName, " +
            "reviewSource, validatedReviewer, incentivized, aiTranslated, " +
            "videoReview, reviewer, questionAnswers. To find products " +
            "first use mindcase#g2/products; for Capterra use " +
            "mindcase#capterra/reviews; for Gartner use " +
            "mindcase#gartner/reviews. $0.004 per review; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/g2/reviews",
        categories: ["company-reviews"],
        notes: [
            "`maxResults` caps rows per input, so a run can return up to " +
            "that many rows for each `products` entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/g2/reviews",
    request: { method: "POST", path: "/v1/data/g2/reviews/run" },
    input: {
        schema: {
            body: zG2ReviewsBody.extend({
                maxResults: zG2ReviewsBody.shape.maxResults.unwrap().min(1)
                    .default(50).describe(
                        "How many reviews to return per product.",
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
            const capped = body.products.length;
            const rows = body.maxResults * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
