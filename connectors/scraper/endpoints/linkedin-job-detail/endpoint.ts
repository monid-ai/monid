import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zLinkedinJobDetailBody } from "./schema/inputs.ts";

/** `POST /linkedin/job-detail`: flat 1 credit per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Job Detail",
        summary: "Get the full public record of one LinkedIn job by id or " +
            "URL.",
        description: "Read one public LinkedIn job (the logged-out job " +
            "page, no account needed) and get its full record: title, " +
            "company name, id, slug, URL and logo, location, posted date, " +
            "the description as plain text and HTML, the criteria " +
            "(experience level, employment type, job function, " +
            "industries), the applicant count, the compensation text, " +
            "featured benefits, how to apply (`linkedin`, `external`, or " +
            "`unknown`), and a closed notice when the job no longer " +
            "accepts applications. Give exactly one of `jobId` (digits) " +
            "or `jobUrl` (a linkedin.com /jobs/view/ URL). It reads one " +
            "job and does not search: to find jobs by keyword, location, " +
            "or company use `scraper#linkedin/jobs`, which returns the " +
            "`jobId` to pass here. For a job on another board use " +
            "`scraper#indeed/jobs` or `scraper#glassdoor/job-detail`.",
        docsUrl: "https://scraper.run/docs/linkedin/job-detail",
        categories: ["jobs", "linkedin"],
        notes: ["1 Scraper credit per call."],
    },
    request: { method: "POST", path: "/linkedin/job-detail" },
    input: { schema: { body: zLinkedinJobDetailBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job detail calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
