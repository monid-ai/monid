import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookPostsBody = z.object({
    urls: z.string()
        .describe(
            "Public Facebook page or profile URL to scrape posts from (e.g. facebook.com/nike or facebook.com/zuck). Private profiles return no results. Use this OR Group URL, not both.",
        )
        .optional(),
    groupUrls: z.string()
        .describe(
            "Public Facebook group URL to scrape member posts from (e.g. facebook.com/groups/<group>). Use this OR Page or Profile URL, not both.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of posts to return. Use 0 for all.")
        .optional(),
    onlyPostsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only get posts published on or after this date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
    onlyPostsOlderThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only get posts published on or before this date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
