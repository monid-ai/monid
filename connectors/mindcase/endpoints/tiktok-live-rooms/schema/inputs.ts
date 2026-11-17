import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/live-rooms` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/live-rooms). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokLiveRoomsBody = z.object({
    keywords: z.array(z.string())
        .describe(
            "Search terms to find currently live rooms that best match the topic.",
        )
        .optional(),
    region: z.string()
        .describe(
            "Two-letter region code to localize the live search, for example US or JP.",
        )
        .optional(),
    handles: z.array(z.string())
        .describe("Usernames to check whether that creator is currently live.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many live rooms to return in total. Defaults to 50; use 0 for all. Applies to Keyword search.",
        )
        .optional(),
}).strict();
