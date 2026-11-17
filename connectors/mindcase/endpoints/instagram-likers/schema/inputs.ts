import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/likers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/likers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramLikersBody = z.object({
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many likers to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
