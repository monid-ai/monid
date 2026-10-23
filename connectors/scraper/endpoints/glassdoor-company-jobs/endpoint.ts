import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorCompanyJobsBody } from "./schema/inputs.ts";

/** `POST /glassdoor/company-jobs`: flat 2 credits per call ⇒ leaf
 *  PER_CALL. The public docs have no page for this tool; the service
 *  source documents it. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Company Jobs",
        summary: "List the current job openings of one Glassdoor employer.",
        description:
            "List the current job openings that one employer has on Glassdoor. " +
            "Each listing has a `job` section (listing id, title, the source job " +
            "id) and a `header` section (posting age and date, location, employer " +
            "name and rating, remote work types, easy-apply and expired flags, " +
            "pay when listed, and Glassdoor links); `overview` adds the company " +
            "overview. It carries no job descriptions. Identify the employer with " +
            "`employerUrl` or `employerId` (at least one; when both are given they " +
            "must name the same employer). Returns up to `maxJobs` listings " +
            "(default 20, max 250) with a `status` of complete or partial. To " +
            "search jobs across employers by keyword use `scraper#glassdoor/jobs`; " +
            "for one listing in full use `scraper#glassdoor/job-detail`; for the " +
            "employer's ratings and profile use `scraper#glassdoor/company-profile`.",
        docsUrl: "https://scraper.run/docs/glassdoor/jobs",
        categories: ["jobs", "company-enrichment"],
        notes: [
            "2 Scraper credits per call, whatever `maxJobs` is.",
            "When both `employerUrl` and `employerId` are given they must" +
            " name the same employer, or the call fails with 400 and no " +
            "credits.",
        ],
    },
    request: { method: "POST", path: "/glassdoor/company-jobs" },
    input: { schema: { body: zGlassdoorCompanyJobsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company job list calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
