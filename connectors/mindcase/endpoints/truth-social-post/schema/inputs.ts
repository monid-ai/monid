import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `truth-social/post` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/truth-social/post). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTruthSocialPostBody = z.object({
    handles: z.array(z.string())
        .describe("One or more handles. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    postedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Posted After as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
}).strict();
