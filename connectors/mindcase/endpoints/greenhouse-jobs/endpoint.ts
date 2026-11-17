import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGreenhouseJobsBody } from "./schema/inputs.ts";

/**
 * Mindcase `greenhouse/jobs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Greenhouse Jobs",
        summary: "Job postings from Greenhouse boards with title, company, " +
            "location and department. Pass the boards or filter by " +
            "location.",
        description:
            "Job postings from Greenhouse boards with title, company, " +
            "location and department. Pass the boards or filter by " +
            "location. Returns one row per job with jobId, jobUrl, " +
            "jobTitle, companyName, board, location, department, " +
            "remoteAllowed, posted, updated, language, education, " +
            "description, departments, offices, customFields. $0.0025 per " +
            "job; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/greenhouse/jobs",
        categories: ["jobs"],
        notes: [
            "`maxJobsPerBoard` caps rows per input, so a run can return " +
            "up to that many rows for each `boards` / `locations` entry.",
            "`maxJobsPerBoard` must be at least 1 here; the raw API reads " +
            "0 or blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/greenhouse/jobs",
    request: { method: "POST", path: "/v1/data/greenhouse/jobs/run" },
    input: {
        schema: {
            body: zGreenhouseJobsBody.extend({
                maxJobsPerBoard: zGreenhouseJobsBody.shape.maxJobsPerBoard
                    .unwrap().min(1).default(100).describe(
                        "Most jobs to return from each company's board.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.boards.length + (body.locations?.length ?? 0);
            const rows = body.maxJobsPerBoard * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
