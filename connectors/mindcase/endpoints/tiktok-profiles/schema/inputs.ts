import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokProfilesBody = z.object({
    searchQueries: z.string()
        .describe(
            "Keyword to find TikTok accounts (e.g. nasa, gymshark, cooking recipes). Any query that works in TikTok search is accepted.",
        ),
    maxProfilesPerQuery: z.number().int().min(1)
        .describe("Number of profiles to return. Use 0 for all.")
        .optional(),
}).strict();
