import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `yahoo-finance/quotes` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/yahoo-finance/quotes). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYahooFinanceQuotesBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more Yahoo Finance tickers. US listings as AAPL or BRK-B; other markets need the exchange suffix (RELIANCE.NS or 500325.BO for India, VOD.L, 7203.T); NSE:RELIANCE also works. Indices as ^ symbols (^NSEI, ^BSESN, ^GSPC) or by name: NIFTY, BANKNIFTY, SENSEX, SP500, NASDAQ100, FTSE100. An unknown ticker is reported as an error. One request reads them all.",
        ),
    range: z.enum([
        "1d",
        "5d",
        "1mo",
        "3mo",
        "6mo",
        "ytd",
        "1y",
        "2y",
        "5y",
        "10y",
        "max",
    ])
        .describe("Range to use. 1 month by default.")
        .optional(),
    interval: z.enum([
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
    ])
        .describe("Interval to use. 1 day by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many quotes to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
