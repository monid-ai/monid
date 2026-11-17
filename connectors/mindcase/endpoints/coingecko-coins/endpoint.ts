import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCoingeckoCoinsBody } from "./schema/inputs.ts";

/**
 * Mindcase `coingecko/coins`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "CoinGecko Coins",
        summary: "Get live market data for cryptocurrencies listed on " +
            "CoinGecko: price, market cap and rank, 24h volume, supply, " +
            "all-time high and low, and 1h/24h/7d price...",
        description: "Get live market data for cryptocurrencies listed on " +
            "CoinGecko: price, market cap and rank, 24h volume, supply, " +
            "all-time high and low, and 1h/24h/7d price changes, by coin " +
            "id, by ticker, or as the top coins by market cap in any of " +
            "60+ currencies. Returns one row per coin with coinId, " +
            "coinUrl, symbol, name, rank, price, currency, change1h, " +
            "change24h, change7d, marketCap, marketCapChange24h, fdv, " +
            "volume24h, high24h, low24h, circulatingSupply, totalSupply, " +
            "maxSupply, ath, athChangePct, athDate, atl, atlDate, image, " +
            "lastUpdated. Call it by top coins, coin id (coinIds), ticker " +
            "(symbols) or category (category). For funding, investors and " +
            "contract addresses use mindcase#crypto/projects. $0.0015 per " +
            "coin; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/coingecko/coins",
        categories: ["token-prices"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/coingecko/coins",
    request: { method: "POST", path: "/v1/data/coingecko/coins/run" },
    input: {
        schema: {
            body: zCoingeckoCoinsBody.extend({
                maxResults: zCoingeckoCoinsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many coins to return in total, up to 1000.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0015 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
