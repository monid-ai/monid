import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorCompanySalariesBody } from "./schema/inputs.ts";

/** `POST /glassdoor/company-salaries`: flat 2 credits per call ⇒ leaf
 *  PER_CALL, whatever `maxSalaries` is. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Company Salaries",
        summary: "Get an employer's salary statistics by job title from " +
            "Glassdoor.",
        description:
            "Get what an employer pays, as Glassdoor reports it: one entry per " +
            "job title with the mean base pay, total pay percentiles, and the pay " +
            "period, plus `salaryMeta` (how many titles Glassdoor holds and the " +
            "query location). `fields` adds the currency and additional pay " +
            "statistics. Narrow it with `jobTitle` (a keyword) and size it with " +
            "`maxSalaries` (default 20, max 250). Identify the employer with " +
            "`employerUrl` or `employerId` (at least one; when both are given " +
            "they must name the same employer). The figures are aggregates of " +
            "pay that employees submitted. For pay ranges in live job ads use " +
            "`scraper#glassdoor/jobs`; for the employer's profile use " +
            "`scraper#glassdoor/company-profile`.",
        docsUrl: "https://scraper.run/docs/glassdoor/salaries",
        categories: ["company-reviews"],
        notes: [
            "2 Scraper credits per call, whatever `maxSalaries` is.",
            "When both `employerUrl` and `employerId` are given they must" +
            " name the same employer, or the call fails with 400 and no " +
            "credits.",
        ],
    },
    request: { method: "POST", path: "/glassdoor/company-salaries" },
    input: { schema: { body: zGlassdoorCompanySalariesBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company salary calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
