import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `internshala/jobs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/internshala/jobs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInternshalaJobsBody = z.object({
    query: z.string()
        .describe("Search Query."),
    city: z.string()
        .describe("City.")
        .optional(),
    workFromHome: z.boolean()
        .describe("Work From Home.")
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many jobs to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
