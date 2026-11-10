import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNaukriJobDetailBody } from "./schema/inputs.ts";

/** `POST /naukri/job-detail`: flat 2 credits per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "Naukri Job Detail",
        summary: "Get the full record of one public Naukri job by ID or URL.",
        description: "Get one public Naukri job in India by its job ID or " +
            "its Naukri URL and receive the full structured record: " +
            "title, description text, company profile (name, industry, " +
            "rating, website), location, work arrangement, experience " +
            "range, salary, skills and role classification, education, " +
            "apply method and deadline, and posting dates. Pass exactly " +
            "one of `jobId` (12 to 30 digits) or `jobUrl` (an HTTPS " +
            "www.naukri.com job URL ending in the job ID). It fetches one " +
            "job and does not search. To find jobs by keyword, location, " +
            "or filters use `scraper#naukri/jobs`, which can also add " +
            "these details to each result with `fetchDetails`.",
        docsUrl: "https://scraper.run/docs/naukri/job-detail",
        categories: ["jobs"],
        notes: ["2 Scraper credits per call."],
    },
    request: { method: "POST", path: "/naukri/job-detail" },
    input: { schema: { body: zNaukriJobDetailBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job detail calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
