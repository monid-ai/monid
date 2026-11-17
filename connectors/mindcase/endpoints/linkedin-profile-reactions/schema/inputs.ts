import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/profile-reactions` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/profile-reactions). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinProfileReactionsBody = z.object({
    profiles: z.string()
        .describe("LinkedIn profile URL to scrape reactions from."),
    maxResults: z.number().int()
        .describe("Number of reactions to return. Use 0 for all.")
        .optional(),
    postedLimit: z.enum(["any", "24h", "week", "month"])
        .describe("Only reactions within this time window.")
        .optional(),
}).strict();
