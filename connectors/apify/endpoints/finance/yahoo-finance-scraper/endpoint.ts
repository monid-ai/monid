import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYahooFinanceScraperBody } from "./schema/inputs.ts";

/**
 * benthepythondev/yahoo-finance-scraper — Yahoo Finance ticker data.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence, rows → the sole metered line) is inherited from the
 * apify provider; the actorId is baked into the start path.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Stock Data from Yahoo Finance",
        summary: "Quote, company profile, price history, financials, " +
            "holders, analyst ratings, earnings, dividends and news per ticker.",
        description: "Returns one record per stock ticker from Yahoo " +
            "Finance with the data types you choose: live quote (price, " +
            "change, volume, market cap, 52-week range), company profile " +
            "and key statistics, OHLCV price history for a period and " +
            "interval, income statement, balance sheet and cash flow, major " +
            "and institutional holders, analyst recommendations, earnings, " +
            "dividends, stock splits, and recent news. Tickers are given " +
            "comma- or newline-separated; works for stocks, ETFs, indices " +
            "and crypto pairs that Yahoo lists.",
        docsUrl: "https://apify.com/benthepythondev/yahoo-finance-scraper",
        categories: ["equities"],
    },
    endpoint: "/benthepythondev/yahoo-finance-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/benthepythondev~yahoo-finance-scraper/runs",
    },
    input: {
        schema: {
            // tickers drives the row count — required at the binding (the
            // actor would otherwise fetch its five-ticker sample)
            body: zYahooFinanceScraperBody.required({ tickers: true }),
        },
    },
    usage: {
        /** The WHOLE published card (D29). The start pin is the scheduled
         *  price effective 2026-11-04 (pricingInfos, read 2026-10-26);
         *  the start event bills $0.01 until then. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    // vendor charge event: "apify-actor-start", one per
                    // started GB; the actor runs at 512 MB → one event
                    consumes: { credit: "default", amount: 0.00004 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "ticker records",
                    // vendor charge event: "apify-default-dataset-item"
                    consumes: { credit: "default", amount: 0.004 },
                },
            },
        },
        /** One record per distinct symbol (the actor splits on commas,
         *  newlines and spaces). */
        estimate: ({ data }) => ({
            counts: {
                default_dataset_item: data.input.body.tickers
                    .split(/[\s,]+/)
                    .filter((symbol) => symbol !== "").length,
            },
        }),
    },
});
