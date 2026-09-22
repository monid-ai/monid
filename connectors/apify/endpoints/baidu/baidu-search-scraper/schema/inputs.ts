import { z } from "zod";

/**
 * johnvc/Baidu-Search-Scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~Baidu-Search-Scraper/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zBaiduSearchScraperBody = z.object({
    query: z.string().describe("The search term to search for on Baidu."),
    device: z.enum(["desktop", "mobile", "tablet"]).describe(
        "The device type to simulate for the search.",
    ).optional(),
    localization: z.number().int().min(1).max(3).describe(
        "Language filter for results. 1 = All languages (default), 2 = Simplified Chinese only, 3 = Traditional Chinese only.",
    ).optional(),
    page: z.number().int().min(1).describe(
        "The starting page number for search results (default: 1).",
    ).optional(),
    num_results: z.number().int().min(1).max(50).describe(
        "Number of results to retrieve per page (max 50, default: 10).",
    ).optional(),
    time_period: z.string().describe(
        "Filter results by date range using Unix timestamps. Format: 'stf=START_UNIX,END_UNIX|stftype=1'. Example for last 7 days: 'stf=1748994000,1749600000|stftype=1'. Leave blank to get results from all dates.",
    ).optional(),
    max_pagination: z.number().int().min(0).describe(
        "Maximum number of pages to fetch (0 = no limit, default: 3 to avoid too many requests).",
    ).optional(),
    output_file: z.string().describe(
        "Optional filename to save results. If not provided, will auto-generate based on query and parameters.",
    ).optional(),
});
