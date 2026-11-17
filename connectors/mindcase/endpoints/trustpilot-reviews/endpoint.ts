import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTrustpilotReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `trustpilot/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Trustpilot Reviews",
        summary: "Extract Trustpilot reviews for any company: rating, text, " +
            "dates, reviewer details and the company's reply, newest " +
            "first.",
        description:
            "Extract Trustpilot reviews for any company: rating, text, " +
            "dates, reviewer details and the company's reply, newest " +
            "first. Returns one row per review with reviewId, reviewUrl, " +
            "rating, reviewTitle, reviewText, language, publishedDate, " +
            "experiencedDate, updatedDate, likes, isVerified, " +
            "verificationLevel, reviewSource, reviewerName, reviewerId, " +
            "reviewerProfileUrl, reviewerCountry, reviewerReviewCount, " +
            "reviewerAvatar, companyReply, companyReplyDate, companyName, " +
            "companyDomain. $0.00075 per review; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/trustpilot/reviews",
        categories: ["company-reviews"],
    },
    endpoint: "/trustpilot/reviews",
    request: { method: "POST", path: "/v1/data/trustpilot/reviews/run" },
    input: {
        schema: {
            body: zTrustpilotReviewsBody.extend({
                maxResults: zTrustpilotReviewsBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Stop after this many reviews in total. Each review costs one row, so this caps the bill as well as the output. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.00075 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
