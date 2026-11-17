import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `wellfound/jobs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/wellfound/jobs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWellfoundJobsBody = z.object({
    query: z.string()
        .describe("Search Query."),
    location: z.string()
        .describe("Location.")
        .optional(),
    remote: z.boolean()
        .describe("Remote.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many jobs to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
