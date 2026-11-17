import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `imdb/videos` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/imdb/videos). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zImdbVideosBody = z.object({
    searchQueries: z.array(z.string())
        .describe("One or more search queries. One request reads them all.")
        .optional(),
    titleIds: z.array(z.string())
        .describe("One or more title ids. One request reads them all.")
        .optional(),
    type: z.enum(["movie", "tv"])
        .describe("Type to use.")
        .optional(),
    yearFrom: z.number().int().min(1874).max(2100)
        .describe("Year From as a whole number.")
        .optional(),
    yearTo: z.number().int().min(1874).max(2100)
        .describe("Year To as a whole number.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many videos to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
