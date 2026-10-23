import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorJobDetailBody } from "./schema/inputs.ts";

/** `POST /glassdoor/job-detail`: flat 2 credits per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Job Detail",
        summary: "Get the full details of one Glassdoor job listing by id " +
            "or URL.",
        description:
            "Get one Glassdoor job listing in full: title, the complete " +
            "description (HTML), job type, work mode, skills, education, years of " +
            "experience, location (city, state, country, coordinates), pay range " +
            "with currency, period, and source, posting dates, and the employer " +
            "profile with ratings, size, revenue, headquarters, CEO, open job " +
            "count, awards, and benefit highlights. Identify the job with `jobId` " +
            "or `jobUrl` (at least one; when both are given they must name the " +
            "same job). `fields` trims or widens the job object. It reads one " +
            "listing: to find listings use `scraper#glassdoor/jobs`, or " +
            "`scraper#glassdoor/company-jobs` for one employer's openings.",
        docsUrl: "https://scraper.run/docs/glassdoor/job-detail",
        categories: ["jobs"],
        notes: [
            "2 Scraper credits per call.",
            "When both `jobUrl` and `jobId` are given they must identify " +
            "the same job, or the call fails with 400 and no credits.",
        ],
    },
    request: { method: "POST", path: "/glassdoor/job-detail" },
    input: { schema: { body: zGlassdoorJobDetailBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job detail calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
