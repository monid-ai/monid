import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPolymarketMarketsBody } from "./schema/inputs.ts";

/**
 * Mindcase `polymarket/markets`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Polymarket Markets",
        summary: "Polymarket prediction markets: each market is a yes/no or " +
            "multi-outcome question people bet on, with live odds, " +
            "trading volume and end date. Browse a...",
        description:
            "Polymarket prediction markets: each market is a yes/no or " +
            "multi-outcome question people bet on, with live odds, " +
            "trading volume and end date. Browse a category such as " +
            "Politics or Crypto, search by keyword (e.g. bitcoin, " +
            "election), or paste polymarket.com event links. Returns one " +
            "row per market with marketId, question, url, groupLabel, " +
            "eventId, eventTitle, status, outcomes, pricing, volume, " +
            "volume24h, volume1w, liquidity, eventVolume, priceChange24h, " +
            "priceChanges, startDate, endDate, tags, rules, " +
            "resolutionSource, conditionId, image. Call it by browse " +
            "(category), keyword search (query) or url or slug (urls). " +
            "$0.0005 per market; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/polymarket/markets",
        categories: ["prediction-markets"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/polymarket/markets",
    request: { method: "POST", path: "/v1/data/polymarket/markets/run" },
    input: {
        schema: {
            body: zPolymarketMarketsBody.extend({
                maxResults: zPolymarketMarketsBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many markets to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
