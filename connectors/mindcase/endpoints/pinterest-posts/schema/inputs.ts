import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `pinterest/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/pinterest/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPinterestPostsBody = z.object({
    query: z.string()
        .describe("Search Query.")
        .optional(),
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
