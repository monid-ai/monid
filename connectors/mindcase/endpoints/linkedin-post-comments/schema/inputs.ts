import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/post-comments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/post-comments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinPostCommentsBody = z.object({
    posts: z.string()
        .describe("LinkedIn post URL to scrape comments from."),
    maxResults: z.number().int()
        .describe("Number of comments to return. Use 0 for all.")
        .optional(),
    postedLimit: z.enum(["any", "24h", "week", "month"])
        .describe("Only comments within this time window.")
        .optional(),
    includeReplies: z.boolean()
        .describe("Also fetch replies to each top-level comment.")
        .optional(),
}).strict();
