import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `sec/kpi-guidance` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/sec/kpi-guidance). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSecKpiGuidanceBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more US stock tickers, e.g. AAPL or BRK-B. SEC data covers US-listed companies only: non-US listings (RELIANCE.NS) and market indices (NIFTY, SENSEX) are refused with a clear error. One request reads them all.",
        ),
    maxReleasesPerTicker: z.number().int().min(1).max(40)
        .describe("Max Releases Per Ticker as a whole number.")
        .optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Start Date as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("End Date as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many filings to return in total. Defaults to 25; use 0 for all.",
        )
        .optional(),
}).strict();
