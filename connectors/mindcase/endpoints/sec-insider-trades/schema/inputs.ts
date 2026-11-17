import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `sec/insider-trades` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/sec/insider-trades). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSecInsiderTradesBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more US stock tickers, e.g. AAPL or BRK-B. SEC data covers US-listed companies only: non-US listings (RELIANCE.NS) and market indices (NIFTY, SENSEX) are refused with a clear error. One request reads them all.",
        ),
    daysBack: z.number().int().min(1).max(90)
        .describe("Days Back as a whole number.")
        .optional(),
    transactionCodes: z.array(
        z.enum(["P", "S", "A", "M", "F", "G", "C", "X", "ALL"]),
    )
        .describe(
            "Which Form 4 transaction codes to include. Leave empty for P and S (open-market purchases and sales); pick All for every code. D, J and other rare codes cannot be filtered here: pick All and filter the Transaction Code column.",
        )
        .optional(),
    includeDerivatives: z.boolean()
        .describe("Include Derivatives.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many trades to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
