import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `youtube/comments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/youtube/comments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYoutubeCommentsBody = z.object({
    videoUrl: z.string()
        .describe(
            "YouTube video URL to scrape comments from. E.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ.",
        ),
    maxResults: z.number().int().min(100)
        .describe("Number of comments to return (minimum 100). Use 0 for all.")
        .optional(),
}).strict();
