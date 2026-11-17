import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `crypto/exchange-listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/crypto/exchange-listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCryptoExchangeListingsBody = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Return listing events on or after this date (YYYY-MM-DD). Format YYYY-MM-DD.",
        ),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only return listing events on or before this date. Format YYYY-MM-DD.",
        )
        .optional(),
    exchange: z.enum([
        "aster",
        "binance",
        "bitget",
        "bithumb",
        "bybit",
        "coinbase",
        "gate",
        "hyperliquid",
        "kraken",
        "okx",
        "robinhood",
        "upbit",
    ])
        .describe(
            "Only events on this exchange. Leave empty for all exchanges.",
        )
        .optional(),
    symbol: z.string()
        .describe(
            "Only events for this token, by ticker, e.g. PEPE or SOL. Leave empty for every token.",
        )
        .optional(),
    eventType: z.enum([
        "listing",
        "delisting",
        "cancelled",
        "advanced",
        "postponed",
    ])
        .describe("Limit results to a specific kind of event.")
        .optional(),
    product: z.enum(["spot", "margin", "perp", "pre_market_perp", "all"])
        .describe("Limit results to a market type such as spot or perpetual.")
        .optional(),
    maxResults: z.number().int().min(1).max(100)
        .describe(
            "How many exchange listing events to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
