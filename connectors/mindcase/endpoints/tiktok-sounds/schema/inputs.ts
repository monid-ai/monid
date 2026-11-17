import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/sounds` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/sounds). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokSoundsBody = z.object({
    keywords: z.array(z.string())
        .describe(
            "Search terms used to find matching sounds, such as a song title and artist.",
        )
        .optional(),
    region: z.string()
        .describe(
            "Two-letter country code to bias search results toward a region.",
        )
        .optional(),
    soundUrls: z.array(z.string())
        .describe(
            "TikTok sound page URLs or numeric sound ids to fetch details for.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many sounds to return in total. Defaults to 50; use 0 for all. Applies to Keyword search.",
        )
        .optional(),
}).strict();
