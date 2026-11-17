import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `youku/videos` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/youku/videos). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYoukuVideosBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many videos to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    publishedWithin: z.enum([
        "all",
        "last_day",
        "last_week",
        "last_two_weeks",
        "last_month",
    ])
        .describe("Published Within to use. All time by default.")
        .optional(),
}).strict();
