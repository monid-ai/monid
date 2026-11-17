import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `sec/insider-ownership` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/sec/insider-ownership). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSecInsiderOwnershipBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more US stock tickers, e.g. AAPL or BRK-B. SEC data covers US-listed companies only: non-US listings (RELIANCE.NS) and market indices (NIFTY, SENSEX) are refused with a clear error. One request reads them all.",
        ),
    daysBack: z.number().int().min(1).max(90)
        .describe("Days Back as a whole number.")
        .optional(),
    transactionTypes: z.array(
        z.enum(["ALL", "P", "S", "A", "M", "F", "G", "C", "X"]),
    )
        .describe(
            "Which Form 4 transaction codes to include. Pick All for every type.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many filings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
