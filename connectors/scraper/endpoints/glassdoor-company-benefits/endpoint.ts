import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorCompanyBenefitsBody } from "./schema/inputs.ts";

/** `POST /glassdoor/company-benefits`: flat 2 credits per call ⇒ leaf
 *  PER_CALL, whatever `maxBenefitReviews` is. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Company Benefits",
        summary: "Get an employer's benefits ratings and employee benefit " +
            "reviews from Glassdoor.",
        description:
            "Get what employees say about an employer's benefits on Glassdoor: " +
            "the overall benefits rating, the total review count, a summary (HTML), " +
            "each benefit (for example health insurance or a retirement plan) with " +
            "its category, rating, and review count, and individual benefit " +
            "reviews with comment, rating, current-job flag, job title, and city. " +
            "Filter by `countryId` (default 1, United States) and size the review " +
            "list with `maxBenefitReviews` (0 to 1000, default 20; 0 skips the " +
            "reviews). Identify the employer with `employerUrl` or `employerId` " +
            "(at least one; when both are given they must name the same " +
            "employer). Benefit reviews are public posts by individuals. For " +
            "reviews of the workplace use `scraper#glassdoor/company-reviews`.",
        docsUrl: "https://scraper.run/docs/glassdoor/benefits",
        categories: ["company-reviews"],
        notes: [
            "2 Scraper credits per call, whatever `maxBenefitReviews` is.",
            "When both `employerUrl` and `employerId` are given they must" +
            " name the same employer, or the call fails with 400 and no " +
            "credits.",
        ],
    },
    request: { method: "POST", path: "/glassdoor/company-benefits" },
    input: { schema: { body: zGlassdoorCompanyBenefitsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company benefit calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
