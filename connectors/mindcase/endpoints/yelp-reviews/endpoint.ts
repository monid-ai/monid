import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYelpReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `yelp/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Yelp Reviews",
        summary: "Individual Yelp reviews: full text, rating, date, reviewer " +
            "profile, reaction counts, photos and owner replies. One " +
            "clean row per review.",
        description:
            "Individual Yelp reviews: full text, rating, date, reviewer " +
            "profile, reaction counts, photos and owner replies. One " +
            "clean row per review. Returns one row per review with " +
            "reviewId, rating, reviewText, reviewDate, reviewUrl, " +
            "language, translatedText, publicReply, photos, photoCaption, " +
            "videos, totalReactions, reactions, firstReviewer, reviewer, " +
            "business. Paste a Yelp business page URL; optionally cap the " +
            "total number of reviews returned. For the business profile " +
            "use mindcase#yelp/business. $0.00025 per review; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/yelp/reviews",
        categories: ["local-business"],
        notes: [
            "`maxReviews` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/yelp/reviews",
    request: { method: "POST", path: "/v1/data/yelp/reviews/run" },
    input: {
        schema: {
            body: zYelpReviewsBody.extend({
                maxReviews: zYelpReviewsBody.shape.maxReviews.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.00025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxReviews;
            return { counts: { RESULT: rows } };
        },
    },
});
