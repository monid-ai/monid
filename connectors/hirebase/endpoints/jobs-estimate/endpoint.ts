import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobsEstimateBody } from "./schema/inputs.ts";

/** POST /v2/jobs/estimate — free match count for a job search. */
export default defineEndpoint({
    meta: {
        displayName: "Count Jobs",
        summary: "Count the jobs a search would match, for free, before " +
            "paying for any of them.",
        description: "Takes the same filters as hirebase#jobs/search and " +
            "returns only a number: with `limit: 0`, how many live jobs " +
            "match. Free, so it is the right first call whenever the " +
            'question is "how many" or "is anyone hiring for this", ' +
            "and the way to size a search before running it: count " +
            "open roles for a title in a city, check whether a company " +
            "has any openings for a role, compare demand across " +
            "locations or skills by counting each, or confirm a filter " +
            "set is not empty or too broad. Returns no job records; " +
            "follow with hirebase#jobs/search to read the jobs, or " +
            "hirebase#jobs/insights for salary and breakdowns of the " +
            "same slice.",
        docsUrl: "https://www.hirebase.org/docs/api-reference/jobs/estimate",
        categories: ["jobs"],
        notes: [
            "The answer is {cost: n}. With limit 0, n is the total match " +
            "count; with any other limit it is capped at that limit.",
        ],
    },
    request: { method: "POST", path: "/jobs/estimate" },
    input: { schema: { body: zJobsEstimateBody } },
    usage: {
        /** Free upstream: sizing a query never draws on an allowance. */
        model: { kind: UsageModelKind.FREE },
    },
});
