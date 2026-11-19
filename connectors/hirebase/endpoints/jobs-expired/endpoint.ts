import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobsExpiredQueryParams } from "./schema/inputs.ts";

/** GET /v2/jobs/expired-jobs — free feed of recently closed job ids. */
export default defineEndpoint({
    meta: {
        displayName: "List Closed Jobs",
        summary: "List the jobs that came down from company careers " +
            "pages since a date in the last 14 days. Free.",
        description: "A feed of job postings that have closed: for each, " +
            "the job _id, company slug, job slug and the day it was " +
            "removed from the employer's careers page. Free. Built for " +
            "keeping a saved set of Hirebase jobs current: after " +
            "collecting jobs with hirebase#jobs/search, call this on a " +
            "schedule and drop the ids it lists, so an agent or a job " +
            "board never shows or applies to a role that is gone. Also " +
            'answers "has this job been filled or pulled" for a known ' +
            "_id. Returns identifiers only, never job content.",
        docsUrl:
            "https://www.hirebase.org/docs/api-reference/jobs/expired-jobs",
        categories: ["jobs"],
        notes: [
            "`since` older than 14 days answers 400.",
            "The feed covers every company, so a day can hold several " +
            "hundred thousand rows; match the ids against the ones you " +
            "hold rather than reading it as a list.",
        ],
    },
    request: { method: "GET", path: "/jobs/expired-jobs" },
    input: { schema: { queryParams: zJobsExpiredQueryParams } },
    usage: {
        /** Free upstream: the feed returns identifiers only. */
        model: { kind: UsageModelKind.FREE },
    },
});
