import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `polymarket/markets` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/polymarket/markets). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPolymarketMarketsBody = z.object({
    category: z.enum([
        "politics",
        "sports",
        "crypto",
        "finance",
        "economy",
        "geopolitics",
        "tech",
        "ai",
        "pop-culture",
        "world",
        "elections",
        "business",
        "science",
        "weather",
        "earnings",
        "esports",
    ])
        .describe(
            "Browse: one of Polymarket's categories (e.g. Politics, Crypto, Sports). Returns the markets in it, biggest first. No search term needed.",
        )
        .optional(),
    query: z.string()
        .describe(
            "Keyword search: a topic, person, asset or event to find markets about (e.g. bitcoin, election, Fed rates).",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "By URL: polymarket.com/event/... links (or just the event slug, e.g. what-price-will-bitcoin-hit-before-2027). Returns every market in each event; a link that ends in a market slug returns just that market.",
        )
        .optional(),
    status: z.enum(["active", "resolved"])
        .describe(
            "Open markets you can still trade (active, the default) or finished ones with a known outcome (resolved).",
        )
        .optional(),
    sortBy: z.enum([
        "volume",
        "volume_24hr",
        "liquidity",
        "start_date",
        "ending_soon",
        "competitive",
    ])
        .describe(
            "How markets are ordered. Defaults to total volume (most-traded first).",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many markets to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
