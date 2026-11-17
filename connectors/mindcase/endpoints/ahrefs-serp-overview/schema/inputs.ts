import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ahrefs/serp-overview` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ahrefs/serp-overview). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAhrefsSerpOverviewBody = z.object({
    keyword: z.array(z.string())
        .describe("Search keywords to look up in the stored SERP snapshot."),
    country: z.string()
        .describe(
            "Country whose Google results to read, e.g. United States. Defaults to United States. Accepts one of 249 values; list them with GET https://api.mindcase.co/v1/data/ahrefs/serp-overview?expand=options.",
        )
        .optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "A historic date to retrieve an older SERP snapshot instead of the latest one. Format YYYY-MM-DD.",
        )
        .optional(),
    maxResults: z.number().int().max(100)
        .describe(
            "How many ranked results to return in total. Defaults to 10; use 0 for all.",
        )
        .optional(),
}).strict();
