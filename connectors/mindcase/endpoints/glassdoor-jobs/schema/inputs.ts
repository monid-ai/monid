import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `glassdoor/jobs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/glassdoor/jobs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGlassdoorJobsBody = z.object({
    query: z.string()
        .describe("Search Query."),
    location: z.string()
        .describe("Location."),
    postedWithinDays: z.enum(["1", "3", "7", "14", "30"])
        .describe("Posted Within Days to use.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many jobs to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
