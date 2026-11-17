import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/profiles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/profiles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramProfilesBody = z.object({
    usernames: z.array(z.string())
        .describe(
            "Instagram usernames (e.g. natgeo, shopify) or full profile URLs (e.g. https://www.instagram.com/natgeo/) to look up.",
        )
        .optional(),
    query: z.string()
        .describe(
            "Keyword to search Instagram accounts by (e.g. coffee, nasa).",
        )
        .optional(),
    maxResults: z.number().int().max(250)
        .describe("Number of profiles to return. Use 0 for all. Capped at 250.")
        .optional(),
}).strict();
