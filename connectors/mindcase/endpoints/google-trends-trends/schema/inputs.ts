import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-trends/trends` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-trends/trends). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleTrendsTrendsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all."),
    country: z.string()
        .describe(
            "Country to use. Accepts one of 241 values; list them with GET https://api.mindcase.co/v1/data/google-trends/trends?expand=options.",
        )
        .optional(),
    timeRange: z.enum([
        "now 1-H",
        "now 4-H",
        "now 1-d",
        "now 7-d",
        "today 1-m",
        "today 3-m",
        "today 12-m",
        "today 5-y",
        "all",
    ])
        .describe("Time Range to use. Past 12 months by default.")
        .optional(),
    startDateEndDate: z.string()
        .describe("Start Date End Date.")
        .optional(),
}).strict();
