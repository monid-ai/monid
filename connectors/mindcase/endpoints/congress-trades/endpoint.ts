import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCongressTradesBody } from "./schema/inputs.ts";

/**
 * Mindcase `congress/trades`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "US Congress Trades",
        summary: "Get stock trades disclosed by members of the US Congress: " +
            "who traded, chamber, party, state, the stock, buy or sell, " +
            "amount range and dates. Filter by...",
        description:
            "Get stock trades disclosed by members of the US Congress: " +
            "who traded, chamber, party, state, the stock, buy or sell, " +
            "amount range and dates. Filter by member or ticker. Returns " +
            "one row per trade with tradeId, member, bioguideId, chamber, " +
            "party, state, issuer, ticker, sector, owner, " +
            "transactionType, amountRange, amountMin, amountMax, " +
            "transactionDate, disclosureDate, daysToDisclose, " +
            "estimatedSharePrice. For corporate insider trades use " +
            "mindcase#sec/insider-trades. $0.0025 per trade; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/congress/trades",
        categories: ["equities", "government-data"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/congress/trades",
    request: { method: "POST", path: "/v1/data/congress/trades/run" },
    input: {
        schema: {
            body: zCongressTradesBody.extend({
                maxResults: zCongressTradesBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many trades to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
