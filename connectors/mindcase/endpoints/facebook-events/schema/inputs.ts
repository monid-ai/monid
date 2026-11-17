import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/events` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/events). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookEventsBody = z.object({
    searchQueries: z.string()
        .describe(
            "A keyword search query to discover events (e.g. Concert New York, tech conference Berlin).",
        )
        .optional(),
    startUrls: z.string()
        .describe(
            "A Facebook event, explore, search, or place URL to scrape events from.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of events to return. Use 0 for all.")
        .optional(),
}).strict();
