import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/followers` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/followers). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokFollowersBody = z.object({
    profiles: z.string()
        .describe(
            "TikTok username or handle whose followers/following you want (with or without @).",
        ),
    maxFollowersPerProfile: z.number().int().min(0)
        .describe(
            "Number of followers to return (accounts that follow the target). Leave blank for all.",
        )
        .optional(),
    maxFollowingPerProfile: z.number().int().min(0)
        .describe(
            "Number of following to return (accounts the target follows). Set to 0 to skip following.",
        )
        .optional(),
}).strict();
