import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGartnerReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `gartner/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Gartner Peer Insights Reviews",
        summary: "Extract Gartner Peer Insights software reviews for any " +
            "product: star rating, title, review summary, date, reviewer " +
            "role, industry and company size, newest...",
        description: "Extract Gartner Peer Insights software reviews for any " +
            "product: star rating, title, review summary, date, reviewer " +
            "role, industry and company size, newest first. Returns one " +
            "row per review with reviewId, reviewUrl, productName, " +
            "productSlug, companySlug, marketSlug, rating, reviewTitle, " +
            "reviewText, publishedDate, reviewerJobTitle, " +
            "reviewerIndustry, reviewerCompanySize, partnerReview, " +
            "productRating, productReviewsTotal. For G2 use " +
            "mindcase#g2/reviews; for Capterra use " +
            "mindcase#capterra/reviews. $0.0025 per review; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/gartner/reviews",
        categories: ["company-reviews"],
        notes: [
            "`maxResults` caps rows per input, so a run can return up to " +
            "that many rows for each `products` entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/gartner/reviews",
    request: { method: "POST", path: "/v1/data/gartner/reviews/run" },
    input: {
        schema: {
            body: zGartnerReviewsBody.extend({
                maxResults: zGartnerReviewsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.products.length;
            const rows = body.maxResults * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
