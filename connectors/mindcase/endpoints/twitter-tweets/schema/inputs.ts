import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitter/tweets` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitter/tweets). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitterTweetsBody = z.object({
    inputs: z.string()
        .describe(
            "A Twitter/X handle (e.g. 'elonmusk' for their timeline including retweets) or a single tweet URL to fetch.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Maximum number of tweets to return. Use 0 for all.")
        .optional(),
    query: z.string()
        .describe(
            "Optional advanced-search query string (Twitter search operators supported, e.g. 'from:nasa min_retweets:50 since:2026-01-01').",
        )
        .optional(),
}).strict();
