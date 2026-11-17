import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePlayReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `google/play/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Play Reviews",
        summary: "Extract Google Play reviews, including reviewer name, " +
            "rating, publish date, and full text.",
        description: "Extract Google Play reviews, including reviewer name, " +
            "rating, publish date, and full text. Returns one row per " +
            "review with reviewer, rating, reviewText, posted, " +
            "appVersion, helpfulVotes, appUrl, reviewUrl, developerReply, " +
            "replyDate, reviewerPhoto, subratings, id, inputsource, " +
            "scoretext, title. $0.0001 per review; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google/play/reviews",
        categories: ["app-stores"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google/play/reviews",
    request: { method: "POST", path: "/v1/data/google/play/reviews/run" },
    input: {
        schema: {
            body: zGooglePlayReviewsBody.extend({
                maxResults: zGooglePlayReviewsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "Number of reviews to return.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
