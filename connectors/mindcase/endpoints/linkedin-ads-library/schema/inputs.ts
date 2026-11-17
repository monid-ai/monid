import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/ads-library` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/ads-library). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinAdsLibraryBody = z.object({
    urls: z.string()
        .describe("LinkedIn Ad Library URL (or company URL)."),
    maxResults: z.number().int()
        .describe("Number of ads to return. Use 0 for all.")
        .optional(),
}).strict();
