import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/followers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/followers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramFollowersBody = z.object({
    usernames: z.string()
        .describe(
            "An Instagram username (e.g. natgeo) or full profile URL (e.g. https://www.instagram.com/natgeo/) whose followers or following list you want to pull.",
        ),
    dataToScrape: z.enum(["Followers", "Followings"])
        .describe(
            "Whether to fetch the account's followers or the accounts it follows.",
        )
        .optional(),
    maxResults: z.number().int().min(50).max(500000)
        .describe("Number of profiles to return (50-500,000). Use 0 for all.")
        .optional(),
}).strict();
