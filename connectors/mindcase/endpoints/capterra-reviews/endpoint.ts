import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCapterraReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `capterra/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Capterra Reviews",
        summary:
            "Capterra software reviews with title, overall rating and the " +
            "ease of use, customer support and features ratings. Pass a " +
            "product URL and optionally filter by...",
        description:
            "Capterra software reviews with title, overall rating and the " +
            "ease of use, customer support and features ratings. Pass a " +
            "product URL and optionally filter by star rating. Returns " +
            "one row per review with reviewId, reviewUrl, reviewTitle, " +
            "rating, easeOfUseRating, customerSupportRating, " +
            "featuresRating, valueForMoneyRating, likelihoodToRecommend, " +
            "pros, cons, reviewText, postedDate, incentive, " +
            "reasonsForChoosing, reasonsForSwitching, " +
            "alternativesConsidered, switchedFrom, vendorResponse, " +
            "reviewer, product. For G2 use mindcase#g2/reviews; for " +
            "Gartner use mindcase#gartner/reviews. $0.0025 per review; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/capterra/reviews",
        categories: ["company-reviews"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/capterra/reviews",
    request: { method: "POST", path: "/v1/data/capterra/reviews/run" },
    input: {
        schema: {
            body: zCapterraReviewsBody.extend({
                maxResults: zCapterraReviewsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(50).describe("How many reviews to return in total."),
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
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
