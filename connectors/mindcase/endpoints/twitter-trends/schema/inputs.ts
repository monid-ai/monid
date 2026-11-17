import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitter/trends` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitter/trends). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitterTrendsBody = z.object({
    locations: z.array(z.string())
        .describe(
            "Where to read trends. Pick Worldwide, any of the 62 countries X reports trends for, or a major city; one request reads them all. Defaults to Worldwide. Through the API any other place X tracks also works: a two-letter country code (US), another city name, or a WOEID (23424977). Accepts one of 123 values; list them with GET https://api.mindcase.co/v1/data/twitter/trends?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many trends to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
