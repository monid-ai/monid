import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `fiverr/gigs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/fiverr/gigs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFiverrGigsBody = z.object({
    query: z.string()
        .describe("Search Query.")
        .optional(),
    fiverrURL: z.string()
        .describe("Fiverr URL.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many gigs to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
