import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokPostsBody = z.object({
    profiles: z.string()
        .describe(
            "TikTok username or handle to scrape posts from (with or without @).",
        )
        .optional(),
    hashtags: z.string()
        .describe("Hashtag name to scrape posts for (without #).")
        .optional(),
    searchQueries: z.string()
        .describe("Free-text search query to find matching TikTok posts.")
        .optional(),
    postURLs: z.array(z.string())
        .describe(
            "Direct TikTok video or post URLs to scrape, one per element.",
        )
        .optional(),
    musics: z.string()
        .describe(
            "TikTok music or sound page URL. Returns posts that use this sound.",
        )
        .optional(),
    resultsPerPage: z.number().int().min(1)
        .describe("Number of posts to return. Use 0 for all.")
        .optional(),
}).strict();
