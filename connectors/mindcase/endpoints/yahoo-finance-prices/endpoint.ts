import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYahooFinancePricesBody } from "./schema/inputs.ts";

/**
 * Mindcase `yahoo-finance/prices`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Yahoo Finance Prices",
        summary:
            "Current prices from Yahoo Finance with quote type, exchange, " +
            "currency, price and change. Pass Yahoo tickers or index " +
            "names, US or global (AAPL, RELIANCE.NS...",
        description:
            "Current prices from Yahoo Finance with quote type, exchange, " +
            "currency, price and change. Pass Yahoo tickers or index " +
            "names, US or global (AAPL, RELIANCE.NS, NIFTY, SENSEX). " +
            "Returns one row per price with symbol, name, quoteType, " +
            "exchange, currency, price, change, changePercent, " +
            "previousClose, open, dayHigh, dayLow, volume, marketCap, " +
            "averageVolume3Month, fiftyTwoWeekHigh, fiftyTwoWeekLow, " +
            "trailingPE, dividendYield, marketState, priceTime, " +
            "quoteDelayMinutes, exchangeTimezone. For price history over " +
            "a range use mindcase#yahoo-finance/quotes; for funds and " +
            "ETFs with fund type use mindcase#yahoo-finance/index-funds; " +
            "for valuation and technical metrics use " +
            "mindcase#finviz/metrics. $0.001 per price; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/yahoo-finance/prices",
        categories: ["equities"],
    },
    endpoint: "/yahoo-finance/prices",
    request: { method: "POST", path: "/v1/data/yahoo-finance/prices/run" },
    input: {
        schema: {
            body: zYahooFinancePricesBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.tickers.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
