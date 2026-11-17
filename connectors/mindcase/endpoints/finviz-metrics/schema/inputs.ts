import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `finviz/metrics` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/finviz/metrics). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFinvizMetricsBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more US stock tickers, e.g. AAPL or BRK-B. Finviz covers US-listed companies only: non-US listings (RELIANCE.NS) and market indices (NIFTY, SENSEX) are refused with a clear error. One request reads them all.",
        ),
}).strict();
