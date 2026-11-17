import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/reels` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/reels). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookReelsBody = z.object({
    startUrls: z.string()
        .describe("Facebook page or profile URL to pull recent reels from."),
    maxReels: z.number().int()
        .describe("Number of reels to return. Use 0 for all.")
        .optional(),
}).strict();
