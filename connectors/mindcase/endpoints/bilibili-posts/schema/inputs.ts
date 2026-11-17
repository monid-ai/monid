import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `bilibili/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/bilibili/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBilibiliPostsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    urls: z.array(z.string())
        .describe("One or more video urls. One request reads them all.")
        .optional(),
    sortBy: z.enum(["relevance", "views", "newest", "danmaku", "favorites"])
        .describe("Sort By to use. Most relevant by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
