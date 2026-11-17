import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `youtube/channels` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/youtube/channels). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYoutubeChannelsBody = z.object({
    urls: z.array(z.string())
        .describe(
            "YouTube channel URLs (e.g. https://www.youtube.com/@MrBeast or https://www.youtube.com/channel/UC...) or @handles.",
        )
        .optional(),
    query: z.string()
        .describe(
            "Keyword or phrase to search YouTube channels for (e.g. 'tech reviews' or 'cooking'). Returns the full channel profile for each matching channel.",
        )
        .optional(),
}).strict();
