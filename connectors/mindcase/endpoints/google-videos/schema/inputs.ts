import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google/videos` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google/videos). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleVideosBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    timeframe: z.enum(["hour", "day", "week", "month", "year"])
        .describe("Timeframe to use.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many videos to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
