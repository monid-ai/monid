import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/profile-comments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/profile-comments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinProfileCommentsBody = z.object({
    profiles: z.string()
        .describe("LinkedIn profile URL to scrape comments from."),
    maxResults: z.number().int()
        .describe("Number of comments to return. Use 0 for all.")
        .optional(),
    postedLimit: z.enum(["any", "24h", "week", "month"])
        .describe("Only comments within this time window.")
        .optional(),
}).strict();
