import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripadvisorReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tripadvisor/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TripAdvisor Reviews",
        summary:
            "Extract Tripadvisor reviews for specified places, with text, " +
            "rating, dates, reviewer, owner responses, and place details.",
        description:
            "Extract Tripadvisor reviews for specified places, with text, " +
            "rating, dates, reviewer, owner responses, and place details. " +
            "Returns one row per review with reviewId, reviewUrl, " +
            "reviewTitle, reviewText, rating, postedDate, travelDate, " +
            "tripType, language, helpfulVotes, subratings, photos, " +
            "ownerResponse, reviewerName, reviewerProfile, " +
            "reviewerLocation, reviewerContributions, reviewerAvatar, " +
            "placeId, place. $0.002 per review; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tripadvisor/reviews",
        categories: ["local-business", "hotels"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tripadvisor/reviews",
    request: { method: "POST", path: "/v1/data/tripadvisor/reviews/run" },
    input: {
        schema: {
            body: zTripadvisorReviewsBody.extend({
                maxResults: zTripadvisorReviewsBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Number of reviews to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
