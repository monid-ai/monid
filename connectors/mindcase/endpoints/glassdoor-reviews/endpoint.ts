import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGlassdoorReviewsBody } from "./schema/inputs.ts";

/**
 * Mindcase `glassdoor/reviews`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Reviews",
        summary: "Glassdoor employee reviews with rating, title, pros, cons " +
            "and advice to management. Pass the company review URLs.",
        description:
            "Glassdoor employee reviews with rating, title, pros, cons " +
            "and advice to management. Pass the company review URLs. " +
            "Returns one row per review with reviewId, reviewUrl, rating, " +
            "reviewTitle, pros, cons, adviceToManagement, publishedDate, " +
            "language, helpfulVotes, ratingBreakdown, employment, " +
            "companyId, companyName, companyReplies. For open roles use " +
            "mindcase#glassdoor/jobs. $0.002 per review; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/glassdoor/reviews",
        categories: ["company-reviews", "jobs"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/glassdoor/reviews",
    request: { method: "POST", path: "/v1/data/glassdoor/reviews/run" },
    input: {
        schema: {
            body: zGlassdoorReviewsBody.extend({
                maxResults: zGlassdoorReviewsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(50).describe("How many reviews to return in total."),
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
