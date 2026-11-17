import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/video-analytics` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/video-analytics). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokVideoAnalyticsBody = z.object({
    videoUrls: z.array(z.string())
        .describe(
            "The TikTok video URLs or numeric video ids to pull metrics for.",
        ),
}).strict();
