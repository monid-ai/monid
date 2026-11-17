import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitter/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitter/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitterProfilesBody = z.object({
    inputs: z.array(z.string())
        .describe(
            "One per line. You can input profile URLs or handles (e.g. 'NASA' or 'https://x.com/NASA').",
        )
        .optional(),
    searchTerms: z.string()
        .describe(
            "Keywords or topics to find X (Twitter) accounts for (e.g. 'climate scientist').",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of accounts to return. Use 0 for all.")
        .optional(),
}).strict();
