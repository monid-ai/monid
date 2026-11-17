import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `treasury/rates` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/treasury/rates). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTreasuryRatesBody = z.object({
    series: z.enum([
        "parYield",
        "realYield",
        "billRates",
        "longTermRates",
        "realLongTerm",
        "avgInterestRates",
        "debtToPenny",
    ])
        .describe("Series to use."),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Start Date as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("End Date as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many rates to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
