import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `sec/beneficial-ownership` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/sec/beneficial-ownership). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSecBeneficialOwnershipBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more US stock tickers, e.g. AAPL or BRK-B. SEC data covers US-listed companies only: non-US listings (RELIANCE.NS) and market indices (NIFTY, SENSEX) are refused with a clear error. One request reads them all.",
        ),
    lookbackDays: z.number().int().min(1).max(3650)
        .describe("Lookback Days as a whole number.")
        .optional(),
    scheduleType: z.enum(["all", "13D", "13G"])
        .describe("Schedule Type to use. Both 13D and 13G by default.")
        .optional(),
    minPercent: z.number().int().min(0).max(100)
        .describe("Min Percent as a whole number.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many filings to return in total. Defaults to 10; use 0 for all.",
        )
        .optional(),
}).strict();
