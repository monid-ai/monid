import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `kick/clips` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/kick/clips). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zKickClipsBody = z.object({
    channels: z.array(z.string())
        .describe("One or more channels. One request reads them all."),
    sortBy: z.enum(["views", "date"])
        .describe("Sort By to use. Most viewed first by default.")
        .optional(),
    period: z.enum(["day", "week", "month", "all"])
        .describe("Period to use. All time by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many clips to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
