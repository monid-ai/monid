import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/comments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/comments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramCommentsBody = z.object({
    urls: z.string()
        .describe(
            "Instagram post or reel URL to get comments from. E.g. https://www.instagram.com/p/ABC123/ or https://www.instagram.com/reel/XYZ789/.",
        ),
    maxResults: z.number().int().max(10000)
        .describe(
            "Total number of top-level comments to return. Replies inside threads are not returned; the Comment Replies column counts them. Use 0 for all. Capped at 10,000 per post.",
        )
        .optional(),
}).strict();
