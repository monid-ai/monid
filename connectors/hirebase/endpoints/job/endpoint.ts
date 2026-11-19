import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobPathParams } from "./schema/inputs.ts";

/** GET /v2/jobs/{job_id} — one full job record. */
export default defineEndpoint({
    meta: {
        displayName: "Get Job",
        summary: "Get one job posting in full, including the original " +
            "description, by its Hirebase id.",
        description: "Fetch the complete record for one job by the _id a " +
            "search returned. Adds what search results leave out by " +
            "default, the full original posting (description_raw), " +
            "beside the same parsed fields (title, salary range, " +
            "locations, experience, skills, technologies, apply link, " +
            "posting date). Use it after hirebase#jobs/search or " +
            "hirebase#jobs/neural-search when the agent needs the whole " +
            "posting for one job, for example to write a tailored " +
            "application or to check a requirement. To read many jobs in " +
            "full, a search with return_raw_description is one call " +
            "instead of one per job.",
        docsUrl: "https://www.hirebase.org/docs/api-reference/jobs/get-by-id",
        categories: ["jobs"],
        notes: [
            "An unknown id answers 404 and is not billed.",
        ],
    },
    request: { method: "GET", path: "/jobs/{job_id}" },
    input: { schema: { pathParams: zJobPathParams } },
    usage: {
        /** 1 unit of the jobs allowance per lookup. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "job",
            consumes: { credit: "jobs", amount: 1 },
        },
    },
});
