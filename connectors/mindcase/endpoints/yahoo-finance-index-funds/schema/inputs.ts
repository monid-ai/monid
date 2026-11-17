import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `yahoo-finance/index-funds` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/yahoo-finance/index-funds). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYahooFinanceIndexFundsBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more Yahoo Finance tickers: ETFs and funds (SPY, VFIAX, NIFTYBEES.NS) or indices as ^ symbols (^NSEI, ^BSESN, ^GSPC). Common index names are mapped for you: NIFTY, BANKNIFTY, SENSEX, SP500, NASDAQ100, FTSE100. An unknown ticker is reported as an error. One request reads them all.",
        ),
}).strict();
