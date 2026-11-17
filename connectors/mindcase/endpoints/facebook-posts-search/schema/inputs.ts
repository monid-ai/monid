import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/posts-search` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/posts-search). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookPostsSearchBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["top", "recent"])
        .describe("Sort By to use. Top (popular, any age) by default.")
        .optional(),
    startDate: z.string()
        .describe("Start Date.")
        .optional(),
    endDate: z.string()
        .describe("End Date.")
        .optional(),
}).strict();
