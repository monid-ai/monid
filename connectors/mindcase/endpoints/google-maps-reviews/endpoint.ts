import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google-maps/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Maps Reviews",
        summary: "Extract reviews from Google Maps places (reviewer info, " +
            "ratings, text, responses) using start URLs and max reviews.",
        description:
            "Extract reviews from Google Maps places (reviewer info, " +
            "ratings, text, responses) using start URLs and max reviews. " +
            "Returns one row per review with placeUrl, reviewUrl, " +
            "reviewText, stars, postedAt, reviewer, reviewerUrl, " +
            "reviewerPhoto, reviewerTotalReviews, localGuide, " +
            "reviewLikes, originalLanguage, translatedLanguage, " +
            "translatedText, ownerResponse, ownerResponseDate, " +
            "reviewContext, businessName, category, allCategories, " +
            "businessRating, businessReviews, businessPhoto, latitude, " +
            "longitude, businessAddress, country, language, " +
            "permanentlyClosed, temporarilyClosed and 9 more fields. To " +
            "find places and their place IDs first use " +
            "mindcase#google-maps/places. $0.00025 per review; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google-maps/reviews",
        categories: ["maps", "local-business"],
        notes: [
            "`maxReviews` caps rows per input, so a run can return up to " +
            "that many rows for each `urls` entry.",
            "`maxReviews` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google-maps/reviews",
    request: { method: "POST", path: "/v1/data/google-maps/reviews/run" },
    input: {
        schema: {
            body: zGoogleMapsReviewsBody.extend({
                maxReviews: zGoogleMapsReviewsBody.shape.maxReviews.unwrap()
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
            consumes: { credit: "default", amount: 0.00025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.urls.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = body.maxReviews * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
