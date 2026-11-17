import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAirbnbReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `airbnb/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Airbnb Reviews",
        summary: "Extract Airbnb reviews (text, author, rating, date) from " +
            "provided URLs, specifying a locale.",
        description:
            "Extract Airbnb reviews (text, author, rating, date) from " +
            "provided URLs, specifying a locale. Returns one row per " +
            "review with listingUrl, reviewId, reviewText, " +
            "translatedText, originalLanguage, rating, postedDate, " +
            "highlight, highlightType, hostResponse, hostId, hostName, " +
            "hostProfileUrl, reviewerUserId, reviewerName, " +
            "reviewerProfile, reviewerAvatar, reviewerLocation, " +
            "reviewerTenure. To find listings first use " +
            "mindcase#airbnb/listings. $0.002 per review; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/airbnb/reviews",
        categories: ["hotels"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/airbnb/reviews",
    request: { method: "POST", path: "/v1/data/airbnb/reviews/run" },
    input: {
        schema: {
            body: zAirbnbReviewsBody.extend({
                maxResults: zAirbnbReviewsBody.shape.maxResults.unwrap().min(1)
                    .describe(
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
