import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `rumble/videos` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/rumble/videos). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zRumbleVideosBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    channelUrls: z.array(z.string())
        .describe("One or more channel urls. One request reads them all.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many videos to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["relevance", "views", "date", "rumbles"])
        .describe("Sort By to use.")
        .optional(),
    uploadDate: z.enum(["today", "this-week", "this-month", "this-year"])
        .describe("Upload Date to use.")
        .optional(),
    duration: z.enum(["short", "long"])
        .describe("Duration to use.")
        .optional(),
}).strict();
