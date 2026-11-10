import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUpworkJobDetailBody } from "./schema/inputs.ts";

/** `POST /upwork/job-detail`: flat 1 credit per call ⇒ leaf PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "Upwork Job Detail",
        summary: "Get one public Upwork freelance job by ID or URL, with " +
            "its full description.",
        description: "Fetch one public Upwork job and get the full record " +
            "back: title, canonical URL, posted time, the full " +
            "description as text and sanitized HTML, location " +
            "eligibility, contract type (hourly rate range or fixed " +
            "price, experience level, duration, weekly hours), skills, " +
            "client activity (proposals, interviewing, invites) and " +
            "client profile (payment verified, location, spend, hires, " +
            "rating). Give exactly one of `jobId` (`~02` plus 18 to 30 " +
            "digits) or `jobUrl`. A job that does not exist or is no " +
            "longer public fails with 404 job_not_found and draws no " +
            "credit. To find jobs use `scraper#upwork/jobs`, which also " +
            "takes `fetchDetails` for up to 10 jobs in one call.",
        docsUrl: "https://scraper.run/docs/upwork/job-detail",
        categories: ["jobs"],
        notes: ["1 Scraper credit per call."],
    },
    request: { method: "POST", path: "/upwork/job-detail" },
    input: { schema: { body: zUpworkJobDetailBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job detail calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
