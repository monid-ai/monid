import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBookingReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `booking/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Booking Reviews",
        summary: "Extract Booking.com hotel reviews, ratings, stars, and " +
            "reviewer details from hotel URLs.",
        description: "Extract Booking.com hotel reviews, ratings, stars, and " +
            "reviewer details from hotel URLs. Returns one row per review " +
            "with reviewId, reviewTitle, liked, disliked, rating, " +
            "postedDate, language, travelerType, room, checkIn, checkOut, " +
            "helpfulVotes, photos, propertyResponse, reviewerName, " +
            "reviewerLocation, reviewerAvatar, hotel. To find properties " +
            "first use mindcase#booking/listings. $0.002 per review; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/booking/reviews",
        categories: ["hotels"],
        notes: [
            "`maxReviewsPerHotel` caps rows per input, so a run can " +
            "return up to that many rows for each `urls` entry.",
            "`maxReviewsPerHotel` must be at least 1 here; the raw API " +
            "reads 0 or blank as unlimited, which cannot be priced up " +
            "front.",
        ],
    },
    endpoint: "/booking/reviews",
    request: { method: "POST", path: "/v1/data/booking/reviews/run" },
    input: {
        schema: {
            body: zBookingReviewsBody.extend({
                maxReviewsPerHotel: zBookingReviewsBody.shape.maxReviewsPerHotel
                    .unwrap().min(1).describe(
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
            const capped = body.urls.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = body.maxReviewsPerHotel * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
