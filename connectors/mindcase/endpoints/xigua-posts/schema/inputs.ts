import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `xigua/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/xigua/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zXiguaPostsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
