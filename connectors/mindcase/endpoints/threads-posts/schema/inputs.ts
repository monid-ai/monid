import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `threads/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/threads/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zThreadsPostsBody = z.object({
    handles: z.array(z.string())
        .describe("One or more handles. One request reads them all.")
        .optional(),
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    postedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Posted After as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    postedBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Posted Before as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
