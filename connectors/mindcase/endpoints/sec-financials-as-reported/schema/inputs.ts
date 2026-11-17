import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `sec/financials-as-reported` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/sec/financials-as-reported). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSecFinancialsAsReportedBody = z.object({
    tickers: z.array(z.string())
        .describe(
            "One or more US stock tickers or SEC CIK numbers, e.g. AAPL, MSFT, BRK-B, 320193. SEC data covers US-listed companies only: non-US listings (RELIANCE.NS) and market indices (NIFTY, SENSEX) are refused with a clear error. One request reads them all.",
        )
        .optional(),
    statement: z.enum([
        "core",
        "incomeStatement",
        "balanceSheet",
        "cashFlow",
        "perShare",
        "all",
        "custom",
    ])
        .describe(
            'A ready-made set of concepts to pull, e.g. Income statement = revenue, costs, operating income, net income and 17 more. Combines with Concepts: you get the set plus any concepts you pick. Left empty: Core, or only your picked Concepts if you pick any. "Only the concepts I pick" needs at least one concept.',
        )
        .optional(),
    periodType: z.enum(["annual", "quarterly"])
        .describe(
            "Annual (full-year figures) or Quarterly (three-month figures). Balance-sheet items are point-in-time values and come with either. Annual by default.",
        )
        .optional(),
    periods: z.number().int().min(1).max(200)
        .describe(
            "Number of most recent periods to return for each company and concept, e.g. 12 = the last 12 years with Annual, the last 12 quarters with Quarterly. Default 12.",
        )
        .optional(),
    fromYear: z.number().int().min(2008).max(2100)
        .describe(
            "Only periods ending in this year or later, e.g. 2020. Leave empty for no lower bound (SEC XBRL data starts around 2009). Applies before Periods.",
        )
        .optional(),
    concepts: z.array(z.string())
        .describe(
            "A concept is the standard XBRL name for one financial line item, e.g. Revenues, NetIncomeLoss, Assets or EarningsPerShareDiluted. Pick from the 85 curated concepts; through the API any other XBRL tag a company reports also works, e.g. ifrs-full:Revenue or a company's own custom tag. Added on top of Statement. Accepts one of 85 values; list them with GET https://api.mindcase.co/v1/data/sec/financials-as-reported?expand=options.",
        )
        .optional(),
    concept: z.string()
        .describe(
            "All companies mode: the one line item to rank every SEC filer by, e.g. Revenues, NetIncomeLoss or Assets. Pick from the 85 curated concepts; through the API any other us-gaap or dei concept name also works. A concept SEC has no figures for returns no rows. Accepts one of 85 values; list them with GET https://api.mindcase.co/v1/data/sec/financials-as-reported?expand=options.",
        )
        .optional(),
    year: z.number().int().min(2009).max(2100)
        .describe(
            "All companies mode: the calendar year, e.g. 2023. SEC lines each company's fiscal year up with the closest calendar year. Left empty: the latest full calendar year.",
        )
        .optional(),
    quarter: z.enum(["full", "Q1", "Q2", "Q3", "Q4"])
        .describe(
            "All companies mode: the whole year or one calendar quarter. Balance-sheet items and share counts are read as of the period end (for Full year, Dec 31). Full year by default.",
        )
        .optional(),
    unit: z.enum(["USD", "USD/shares", "shares", "EUR", "pure"])
        .describe(
            "All companies mode: the unit the values are reported in. Left empty: USD, or USD per share for EPS and dividends per share, or shares for share counts. Companies that report in another unit are not included.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many rows to return in total. Defaults to 50; use 0 for all with Tickers. All companies returns the largest companies first, up to 1000 per run (0 is not allowed there).",
        )
        .optional(),
}).strict();
