import { z } from "zod";

/**
 * johnvc/us-congress-financial-disclosures-and-stock-trading-data — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~us-congress-financial-disclosures-and-stock-trading-data/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zUsCongressFinancialDisclosuresAndStockTradingDataBody = z.object({
    First_Name: z.string().describe(
        "Filter by the first name of the congressional member. Case-insensitive partial match. Leave blank to search all members.",
    ).optional(),
    Last_Name: z.string().describe(
        "Filter by the last name of the congressional member. Case-insensitive partial match. Leave blank to search all members.",
    ).optional(),
    Date_Reported: z.string().describe(
        "Filter to disclosures with this exact transaction date in YYYY-MM-DD format. Leave blank to ignore. Use Start_Date and End_Date instead for a range.",
    ).optional(),
    Start_Date: z.string().describe(
        "Earliest transaction date to include (inclusive), in YYYY-MM-DD format. Pair with End_Date for a range. Leave blank for no lower bound.",
    ).optional(),
    End_Date: z.string().describe(
        "Latest transaction date to include (inclusive), in YYYY-MM-DD format. Pair with Start_Date for a range. Leave blank for no upper bound.",
    ).optional(),
    Stock_Symbol: z.string().describe(
        "Filter to transactions involving this ticker (e.g. AAPL, MSFT, NVDA). Case-insensitive partial match. Leave blank to include all tickers.",
    ).optional(),
    Max_Results: z.number().int().min(1).max(1000).describe(
        "Maximum number of disclosure records to return per run. Range 1-1000. Default 100.",
    ).optional(),
});
