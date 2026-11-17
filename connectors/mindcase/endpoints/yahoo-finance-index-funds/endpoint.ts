import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYahooFinanceIndexFundsBody } from "./schema/inputs.ts";

/**
 * Mindcase `yahoo-finance/index-funds`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Yahoo Finance Index Funds",
        summary:
            "Index funds, ETFs and market indices from Yahoo Finance with " +
            "fund type, exchange, currency and price. Pass tickers or " +
            "index names (SPY, NIFTYBEES.NS, NIFTY...",
        description:
            "Index funds, ETFs and market indices from Yahoo Finance with " +
            "fund type, exchange, currency and price. Pass tickers or " +
            "index names (SPY, NIFTYBEES.NS, NIFTY, SENSEX). Returns one " +
            "row per fund with symbol, name, fundType, exchange, " +
            "currency, price, priceTime, previousClose, changePercent, " +
            "fiftyTwoWeekLow, fiftyTwoWeekHigh, expenseRatioPct, " +
            "netAssets, dividendYieldPct, ytdReturnPct, fundFamily, " +
            "category, legalType, holdingsTurnover, beta3Year, " +
            "firstTradeDate, description, portfolio, performance. For a " +
            "stock's current price use mindcase#yahoo-finance/prices; for " +
            "price history use mindcase#yahoo-finance/quotes. $0.001 per " +
            "fund; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/yahoo-finance/index-funds",
        categories: ["equities"],
    },
    endpoint: "/yahoo-finance/index-funds",
    request: { method: "POST", path: "/v1/data/yahoo-finance/index-funds/run" },
    input: {
        schema: {
            body: zYahooFinanceIndexFundsBody,
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
