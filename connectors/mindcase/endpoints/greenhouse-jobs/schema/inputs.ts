import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `greenhouse/jobs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/greenhouse/jobs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGreenhouseJobsBody = z.object({
    boards: z.array(z.string())
        .describe("One or more boards. One request reads them all."),
    locations: z.array(z.string())
        .describe("One or more locations. One request reads them all.")
        .optional(),
    postedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Posted After as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    maxJobsPerBoard: z.number().int().min(0)
        .describe(
            "Most jobs to return from each company's board. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
