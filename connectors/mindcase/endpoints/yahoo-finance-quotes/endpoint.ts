import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYahooFinanceQuotesBody } from "./schema/inputs.ts";

/**
 * Mindcase `yahoo-finance/quotes`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Yahoo Finance Quotes",
        summary:
            "Price history from Yahoo Finance with open, high, low, close " +
            "and volume over the range and interval you choose. Pass " +
            "Yahoo tickers or index names, US or...",
        description:
            "Price history from Yahoo Finance with open, high, low, close " +
            "and volume over the range and interval you choose. Pass " +
            "Yahoo tickers or index names, US or global (AAPL, " +
            "RELIANCE.NS, NIFTY, SENSEX). Returns one row per quote with " +
            "symbol, date, name, exchange, currency, open, high, low, " +
            "close, adjClose, volume. For the current price only use " +
            "mindcase#yahoo-finance/prices. $0.002 per quote; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/yahoo-finance/quotes",
        categories: ["equities"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/yahoo-finance/quotes",
    request: { method: "POST", path: "/v1/data/yahoo-finance/quotes/run" },
    input: {
        schema: {
            body: zYahooFinanceQuotesBody.extend({
                maxResults: zYahooFinanceQuotesBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many quotes to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
