import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorCompanyInterviewsBody } from "./schema/inputs.ts";

/** `POST /glassdoor/company-interviews`: flat 2 credits per call ⇒ leaf
 *  PER_CALL, whatever `maxInterviews` is. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Company Interviews",
        summary: "Get interview experiences reported for an employer on " +
            "Glassdoor.",
        description:
            "Get the interview reports that candidates posted about an employer " +
            "on Glassdoor: job title, date, difficulty, outcome, overall " +
            "experience, and the questions asked. `fields` adds advice, the " +
            "process and negotiation descriptions, helpful votes, and employer " +
            "responses. Returns up to `maxInterviews` entries (default 20, max " +
            "250) and `interviewStats` (totals and the split by experience and by " +
            "how candidates got the interview). Entries are public posts by " +
            "individuals. Identify the employer with `employerUrl` or " +
            "`employerId` (at least one; when both are given they must name the " +
            "same employer). For employee reviews use " +
            "`scraper#glassdoor/company-reviews`; for pay use " +
            "`scraper#glassdoor/company-salaries`.",
        docsUrl: "https://scraper.run/docs/glassdoor/interviews",
        categories: ["company-reviews"],
        notes: [
            "2 Scraper credits per call, whatever `maxInterviews` is.",
            "When both `employerUrl` and `employerId` are given they must" +
            " name the same employer, or the call fails with 400 and no " +
            "credits.",
        ],
    },
    request: { method: "POST", path: "/glassdoor/company-interviews" },
    input: { schema: { body: zGlassdoorCompanyInterviewsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company interview calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
