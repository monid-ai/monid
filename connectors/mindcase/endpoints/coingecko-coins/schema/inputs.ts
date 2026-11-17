import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `coingecko/coins` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/coingecko/coins). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCoingeckoCoinsBody = z.object({
    coinIds: z.array(z.string())
        .describe(
            "CoinGecko coin ids, the last part of the coin page URL coingecko.com/en/coins/<id> (e.g. bitcoin, ethereum, jasmycoin). One row per coin found; an unknown id returns no row and is not billed. Not allowed with Tickers.",
        )
        .optional(),
    symbols: z.array(z.string())
        .describe(
            "Coin tickers such as btc, eth, sol (any case). Each ticker returns its highest-ranked coin, so use Coin IDs when several coins share a ticker. Not allowed with Coin IDs.",
        )
        .optional(),
    category: z.string()
        .describe(
            "CoinGecko category id, the last part of coingecko.com/en/categories/<id>, e.g. meme-token, layer-1, stablecoins. Returns the coins in that category by market cap.",
        )
        .optional(),
    currency: z.string()
        .describe(
            "Currency for price, market cap, volume, highs and lows. USD by default. Accepts one of 63 values; list them with GET https://api.mindcase.co/v1/data/coingecko/coins?expand=options.",
        )
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many coins to return in total, up to 1000. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
