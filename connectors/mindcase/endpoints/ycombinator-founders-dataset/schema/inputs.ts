import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ycombinator/founders-dataset` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ycombinator/founders-dataset). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYcombinatorFoundersDatasetBody = z.object({
    batch: z.string()
        .describe("YC batch, e.g. `W25` or `Winter 2025`.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Stop after this many founders. Omitted means the whole dataset (about 9,000 rows).",
        )
        .optional(),
}).strict();
