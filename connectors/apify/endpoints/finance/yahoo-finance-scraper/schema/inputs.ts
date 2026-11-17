import { z } from "zod";

/**
 * benthepythondev/yahoo-finance-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/benthepythondev~yahoo-finance-scraper/builds/default →
 * actorDefinition.input) on 2026-10-26 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zYahooFinanceScraperBody = z.object({
    tickers: z.string().describe(
        "List of stock symbols to scrape (e.g., AAPL, MSFT, GOOGL). Comma-separated or one per line.",
    ).optional(),
    dataTypes: z.array(
        z.enum([
            "quote",
            "info",
            "history",
            "financials",
            "holders",
            "recommendations",
            "earnings",
            "dividends",
            "splits",
            "news",
        ]),
    ).describe("Select which data to retrieve for each ticker").optional(),
    historyPeriod: z.enum([
        "1d",
        "5d",
        "1mo",
        "3mo",
        "6mo",
        "1y",
        "2y",
        "5y",
        "10y",
        "ytd",
        "max",
    ]).describe(
        "Time period for historical data (only used if 'history' is selected)",
    ).optional(),
    historyInterval: z.enum([
        "1m",
        "2m",
        "5m",
        "15m",
        "30m",
        "60m",
        "90m",
        "1h",
        "1d",
        "5d",
        "1wk",
        "1mo",
        "3mo",
    ]).describe("Data interval for historical prices").optional(),
});
