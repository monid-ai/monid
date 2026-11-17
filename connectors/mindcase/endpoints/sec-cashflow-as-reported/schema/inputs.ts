import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `sec/cashflow-as-reported` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/sec/cashflow-as-reported). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSecCashflowAsReportedBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more US stock tickers, e.g. AAPL or BRK-B. SEC data covers US-listed companies only: non-US listings (RELIANCE.NS) and market indices (NIFTY, SENSEX) are refused with a clear error. One request reads them all.",
        ),
    period: z.enum(["annual", "quarterly"])
        .describe("Period to use. Annual (10-K) by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many statements to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
