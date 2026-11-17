import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorJobsBody } from "./schema/inputs.ts";

/** `POST /glassdoor/jobs`: flat 2 credits per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Jobs",
        summary: "Search Glassdoor job listings by keyword, location, pay, " +
            "seniority, and work mode.",
        description: "Search Glassdoor job listings by `keyword` and get " +
            "structured jobs back: job id and URL, title, posting age and " +
            "date, location, pay range with currency and period, employer " +
            "name and rating, and easy-apply and expired flags. Filter by " +
            "`location` and `radius`, recency (`fromAge`, 1 to 30 days), " +
            "`jobType`, `seniorityType`, work mode (`remoteWorkType`: " +
            "remote, hybrid, on-site), `easyApply`, `minSalary` and " +
            "`maxSalary`, `employerSizes`, and `postedBy`. Returns up to " +
            "`maxJobs` jobs (default 20, max 250) with `totalJobsCount`, " +
            "and a `status` of complete or partial with `failedSections`. " +
            "A search result carries a description snippet only: pass its " +
            "`jobId` to `scraper#glassdoor/job-detail` for the full " +
            "description, skills, and employer profile. `fields` trims or " +
            "widens each job; the employer's own apply page (`applyUrl`) " +
            "is returned only when asked for. For one employer's open " +
            "roles use `scraper#glassdoor/company-jobs`; for the same " +
            "search on other boards use `scraper#indeed/jobs` or " +
            "`scraper#linkedin/jobs`.",
        docsUrl: "https://scraper.run/docs/glassdoor/jobs",
        categories: ["jobs"],
        notes: [
            "2 Scraper credits per call, whatever `maxJobs` is.",
            "`maxSalary` must be greater than or equal to `minSalary` " +
            "when both are given, or the call fails with 400 and no " +
            "credits.",
        ],
    },
    request: { method: "POST", path: "/glassdoor/jobs" },
    input: { schema: { body: zGlassdoorJobsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job search calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
