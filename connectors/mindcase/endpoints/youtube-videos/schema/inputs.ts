import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `youtube/videos` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/youtube/videos). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYoutubeVideosBody = z.object({
    query: z.string()
        .describe(
            "Keyword or phrase to search YouTube (e.g. 'python tutorial'). Returns ranked video results matching the query.",
        )
        .optional(),
    channelUrl: z.string()
        .describe(
            "YouTube channel URL (e.g. https://www.youtube.com/@MrBeast or https://www.youtube.com/channel/UC...) or @handle. Returns all videos from the channel.",
        )
        .optional(),
    contentType: z.enum(["videos", "shorts"])
        .describe(
            "Which part of the channel to pull (By Channel mode only): regular Videos or Shorts. Overrides any tab in the channel URL you paste.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "Direct YouTube video URLs (e.g. https://www.youtube.com/watch?v=...). One per line. Returns full metadata for each video.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Total number of videos to return. Applies to Search and Channel modes.",
        )
        .optional(),
    onlyVideosNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only return videos published on or after this date (YYYY-MM-DD, or a full ISO timestamp). In Channel mode the filter is applied before any video is fetched, so a window with no new uploads returns no rows and costs nothing. Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
