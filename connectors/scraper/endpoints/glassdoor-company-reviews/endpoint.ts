import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorCompanyReviewsBody } from "./schema/inputs.ts";

/** `POST /glassdoor/company-reviews`: flat 2 credits per call ⇒ leaf
 *  PER_CALL, whatever `maxReviews` is. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Company Reviews",
        summary: "Get employee reviews of a company from Glassdoor, with " +
            "its rating breakdown.",
        description:
            "Get the employee reviews that Glassdoor shows for an employer: " +
            "summary, pros, cons, advice to management when given, overall and " +
            "category ratings, CEO, outlook, and recommendation opinions, and the " +
            "reviewer's job title, employment status, and location. Newest first " +
            'by default, or by `sort: "RATING"`. Returns up to `maxReviews` ' +
            "reviews (default 20, max 100000), plus `companyStats` (rating " +
            "averages and rating distributions from the first page), " +
            "`totalReviews`, and `truncated` when a later page failed. Reviews are " +
            "public posts by individuals. Identify the employer with " +
            "`employerUrl` or `employerId` (at least one; employerId wins when " +
            "both are given). For the employer's profile use " +
            "`scraper#glassdoor/company-profile`; for pay use " +
            "`scraper#glassdoor/company-salaries`; for interview reports use " +
            "`scraper#glassdoor/company-interviews`.",
        docsUrl: "https://scraper.run/docs/glassdoor/reviews",
        categories: ["company-reviews"],
        notes: ["2 Scraper credits per call, whatever `maxReviews` is."],
    },
    request: { method: "POST", path: "/glassdoor/company-reviews" },
    input: { schema: { body: zGlassdoorCompanyReviewsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company review calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
