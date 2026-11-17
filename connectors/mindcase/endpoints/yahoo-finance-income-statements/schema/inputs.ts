import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `yahoo-finance/income-statements` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/yahoo-finance/income-statements). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYahooFinanceIncomeStatementsBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more Yahoo Finance tickers. US listings as AAPL or BRK-B; other markets need the exchange suffix (RELIANCE.NS or 500325.BO for India, VOD.L, 7203.T); NSE:RELIANCE also works. An unknown ticker is reported as an error. One request reads them all.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many statements to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
