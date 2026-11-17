import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `youtube/community-posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/youtube/community-posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYoutubeCommunityPostsBody = z.object({
    channels: z.array(z.string())
        .describe(
            "One or more YouTube channel IDs to fetch community posts for.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total across all channels, shared evenly between them. Defaults to 50; use 0 for all. Each channel is read up to 50 pages (about 450 most recent posts), so very active channels may return fewer posts than their full history.",
        )
        .optional(),
}).strict();
