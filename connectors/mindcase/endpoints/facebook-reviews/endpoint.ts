import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Reviews",
        summary: "Facebook page reviews: the recommend flag, review text, " +
            "date, reviewer, likes, tags and photos, from one or more " +
            "page URLs.",
        description:
            "Facebook page reviews: the recommend flag, review text, " +
            "date, reviewer, likes, tags and photos, from one or more " +
            "page URLs. Returns one row per review with recommended, " +
            "reviewText, reviewDate, reviewUrl, reviewId, reviewerName, " +
            "reviewerProfileUrl, likes, commentCount, tags, " +
            "reviewerAvatar, topComments, photos, error, " +
            "errorDescription. Pull the reviews/recommendations from a " +
            "Facebook page by URL. For the page profile use " +
            "mindcase#facebook/pages. $0.0025 per review; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/reviews",
        categories: ["facebook"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/reviews",
    request: { method: "POST", path: "/v1/data/facebook/reviews/run" },
    input: {
        schema: {
            body: zFacebookReviewsBody.extend({
                maxResults: zFacebookReviewsBody.shape.maxResults.unwrap().min(
                    1,
                ).describe(
                    "Number of reviews to return in total. Required, at least 1.",
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
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
