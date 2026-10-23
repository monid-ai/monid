import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zLinkedinJobsBody } from "./schema/inputs.ts";

/** `POST /linkedin/jobs`: flat 1 credit per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Jobs",
        summary: "Search public LinkedIn jobs by keyword and location, or " +
            "list one company's jobs by company id.",
        description: "Search public LinkedIn job listings (the logged-out " +
            "search, no account needed) and get job summaries back: job " +
            "id and URL, title, company name, slug, URL and logo, " +
            "location, posted date and time-ago text, a new-job flag, the " +
            "listed salary, the hiring badge and signal, and a benefits " +
            "summary. Give either `keyword` (with an optional `location`) " +
            "or `companyId` to list one company's jobs, never both. " +
            "Filter by job type, experience level, work type (on site, " +
            "remote, hybrid), posting window, minimum salary, and Easy " +
            "Apply, and sort by relevance or recency. Returns up to " +
            "`maxItems` (1-100) with `count`, `truncated`, `partial`, and " +
            "`warnings` that say when a filter or LinkedIn cut the " +
            "result short. A summary has no description: for the full " +
            "text, criteria, applicants, and apply method of one job use " +
            "`scraper#linkedin/job-detail` with its `jobId`. For the same " +
            "roles on other boards use `scraper#indeed/jobs` or " +
            "`scraper#glassdoor/jobs`.",
        docsUrl: "https://scraper.run/docs/linkedin/jobs",
        categories: ["jobs", "linkedin"],
        notes: ["1 Scraper credit per call, whatever `maxItems` is."],
    },
    request: { method: "POST", path: "/linkedin/jobs" },
    input: { schema: { body: zLinkedinJobsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job search calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
