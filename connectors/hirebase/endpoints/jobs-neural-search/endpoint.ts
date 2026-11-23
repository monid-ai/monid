import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { LIMIT_MAX } from "../../schema/common.ts";
import { zJobsNeuralSearchBody } from "./schema/inputs.ts";

/** POST /v2/jobs/neural-search — semantic + filtered job search. */
export default defineEndpoint({
    meta: {
        displayName: "Neural Search Jobs",
        summary: "Find jobs by meaning: a plain-English description, a " +
            'resume, or "more like this job", with optional filters.',
        description: "Rank live job postings by how well they match a " +
            "meaning rather than exact words. Give vector.query a " +
            'plain-English description ("backend engineer at an ' +
            'early-stage climate startup"), vector.job_ids for jobs ' +
            "similar to ones already found, or vector.artifact_id to " +
            "match a resume stored in Hirebase. Add lexical filters " +
            "(titles, location, remote, salary, experience, company, " +
            "company size, industry, posting date) to constrain the " +
            "candidates; results come back most-similar first. Returns " +
            "the same job records as hirebase#jobs/search. Reach for " +
            "this when the request describes the kind of job rather than " +
            "its exact title, or when title wording varies too much for " +
            "filters to catch; when plain filters are enough, " +
            "hirebase#jobs/search is faster and supports signals, " +
            "funding filters and sorting by date. Suited for job " +
            'matching and recommendation agents and "similar jobs" ' +
            "features.",
        docsUrl:
            "https://www.hirebase.org/docs/api-reference/jobs/neural-search-post",
        categories: ["jobs"],
        notes: [
            "vector is required, with one of query, job_ids or " +
            "artifact_id inside it.",
            "The first page of a new query takes 10 to 25 seconds while " +
            "the ranking is computed; later pages of the same query are " +
            "fast for 15 minutes.",
            "Results come back most-similar first but carry no similarity " +
            "score.",
            "total_count is capped by the endpoint and is not a market " +
            "size. Use hirebase#jobs/estimate to count matches.",
        ],
    },
    request: { method: "POST", path: "/jobs/neural-search" },
    timeouts: { requestMs: 90_000, runMs: 90_000 },
    // `limit` REQUIRED and CAPPED at the binding (design D25).
    input: {
        schema: {
            body: zJobsNeuralSearchBody.extend({
                limit: zJobsNeuralSearchBody.shape.limit.unwrap()
                    .max(LIMIT_MAX),
            }),
        },
    },
    usage: {
        /** 1 unit of the jobs allowance per job returned. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "jobs",
            consumes: { credit: "jobs", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.limit },
        }),
    },
});
