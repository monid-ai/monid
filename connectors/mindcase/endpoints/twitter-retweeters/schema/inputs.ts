import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitter/retweeters` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitter/retweeters). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitterRetweetersBody = z.object({
    tweet_ids: z.string()
        .describe(
            "The tweet URL or numeric tweet ID (e.g. 'https://x.com/NASA/status/2039473910987534599' or '2039473910987534599') whose retweeters you want to retrieve.",
        ),
    max_items_per_tweet: z.number().int()
        .describe("Number of retweeter profiles to return. Use 0 for all.")
        .optional(),
}).strict();
