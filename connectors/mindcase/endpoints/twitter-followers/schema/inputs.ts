import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitter/followers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitter/followers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitterFollowersBody = z.object({
    handle: z.string()
        .describe(
            "The X (Twitter) account whose network you want. Enter a handle or profile URL (e.g. 'NASA' or 'https://x.com/NASA').",
        ),
    listType: z.enum(["followers", "following"])
        .describe(
            "Which list to pull: 'followers' (accounts that follow this profile) or 'following' (accounts this profile follows).",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of profiles to return. Use 0 for all.")
        .optional(),
}).strict();
