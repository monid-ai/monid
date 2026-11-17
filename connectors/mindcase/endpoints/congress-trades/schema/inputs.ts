import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `congress/trades` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/congress/trades). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCongressTradesBody = z.object({
    ticker: z.string()
        .describe(
            "US stock ticker, e.g. NVDA. Only trades in that exact ticker are returned; non-US listings (RELIANCE.NS) and indices (NIFTY) are refused with a clear error. Leave Ticker and Member empty for the latest trades across Congress.",
        )
        .optional(),
    member: z.string()
        .describe(
            "Member of Congress, e.g. Nancy Pelosi. Combine with Ticker to see one member's trades in one stock.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many trades to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
