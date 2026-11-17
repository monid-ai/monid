import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google/news` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google/news). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleNewsBody = z.object({
    query: z.string()
        .describe("What to search for in Google News."),
    maxResults: z.number().int()
        .describe("Number of news articles to return. Use 0 for all.")
        .optional(),
    timeframe: z.enum(["1h", "1d", "7d", "1y", "all"])
        .describe("How far back to look. Leave blank for no limit.")
        .optional(),
    region_language: z.string()
        .describe(
            "Country market and article language. The two go together (Google News only supports these specific combinations). Defaults to US English. Accepts one of 84 values; list them with GET https://api.mindcase.co/v1/data/google/news?expand=options.",
        )
        .optional(),
}).strict();
