import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/followers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/followers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookFollowersBody = z.object({
    page_urls: z.string()
        .describe(
            "Facebook page or profile URL, or vanity handle (e.g. cocacola).",
        ),
    followType: z.enum(["follower", "following"])
        .describe(
            "Pull the page's followers, the profiles it follows, or both.",
        )
        .optional(),
    limit: z.number().int()
        .describe("Number of profiles to return in total. Use 0 for all.")
        .optional(),
}).strict();
