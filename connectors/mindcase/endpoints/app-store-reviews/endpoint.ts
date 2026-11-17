import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppStoreReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `app-store/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "App Store Reviews",
        summary: "Get App Store reviews with reviewer, rating, review title, " +
            "review text, posted, app version, by inputs or stars.",
        description:
            "Get App Store reviews with reviewer, rating, review title, " +
            "review text, posted, app version, by inputs or stars. " +
            "Returns one row per review with reviewId, reviewer, rating, " +
            "reviewTitle, reviewText, posted, appVersion, edited, " +
            "developerReply, replyDate, appId, appName, appUrl, country. " +
            "For app metadata use mindcase#app-store/apps; for Android " +
            "reviews use mindcase#google/play/reviews. $0.002 per review; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/app-store/reviews",
        categories: ["app-stores"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/app-store/reviews",
    request: { method: "POST", path: "/v1/data/app-store/reviews/run" },
    input: {
        schema: {
            body: zAppStoreReviewsBody.extend({
                maxResults: zAppStoreReviewsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe("How many reviews to return in total."),
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
