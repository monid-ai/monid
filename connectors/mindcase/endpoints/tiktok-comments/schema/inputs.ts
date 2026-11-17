import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/comments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/comments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokCommentsBody = z.object({
    postURLs: z.string()
        .describe(
            "TikTok video URL to get comments from. E.g. https://www.tiktok.com/@username/video/1234567890.",
        )
        .optional(),
    profiles: z.string()
        .describe(
            "TikTok username whose videos' comments you want (with or without @). The actor pulls comments from the profile's videos; use Videos Per Profile to control how many.",
        )
        .optional(),
    commentsPerPost: z.number().int()
        .describe(
            "Number of comments to return. Use 0 for all. Actual counts can vary on very high-comment videos due to TikTok API limits.",
        )
        .optional(),
    topLevelCommentsPerPost: z.number().int()
        .describe("Optional cap on top-level (non-reply) comments per video.")
        .optional(),
    resultsPerPage: z.number().int()
        .describe(
            "By Profile mode only. Number of videos to pull comments from per profile.",
        )
        .optional(),
    profileScrapeSections: z.array(z.enum(["videos", "reposts"]))
        .describe("By Profile mode only. Which sections to pull videos from.")
        .optional(),
    profileSorting: z.enum(["latest", "popular", "oldest"])
        .describe(
            "By Profile mode only. Order videos by latest, most popular, or oldest.",
        )
        .optional(),
    excludePinnedPosts: z.boolean()
        .describe(
            "By Profile mode only. Skip pinned videos at the top of a profile.",
        )
        .optional(),
}).strict();
