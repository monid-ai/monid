import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/highlights` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/highlights). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramHighlightsBody = z.object({
    usernames: z.array(z.string())
        .describe("One or more usernames. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many highlights to return in total. Defaults to 10; use 0 for all.",
        )
        .optional(),
}).strict();
