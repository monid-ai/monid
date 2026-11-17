import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `crypto/etf-flows` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/crypto/etf-flows). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCryptoEtfFlowsBody = z.object({
    asset: z.array(z.enum(["BTC", "ETH", "SOL", "XRP", "HYPE"]))
        .describe(
            "One or more cryptocurrency ticker symbols to get ETF flow data for.",
        ),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only return flow records on or after this date. Format YYYY-MM-DD.",
        )
        .optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only return flow records on or before this date. Format YYYY-MM-DD.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many daily flow records to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
