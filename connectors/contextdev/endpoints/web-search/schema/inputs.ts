import { z } from "zod";
import {
    markdownOptionFields,
    zCountry,
    zScrapeMaxAgeMs,
    zTimeoutOpts,
    zWaitForMs,
} from "../../../schema/common.ts";

/** Inline Markdown scraping options for each search result. */
const zSearchMarkdownOptions = z.object({
    enabled: z.boolean().describe(
        "Scrape each result to Markdown in the same call. Off by default " +
            "to keep search cheap and fast; enabling it consumes additional " +
            "scrape credits.",
    ).optional(),
    includeLinks: markdownOptionFields.includeLinks.optional(),
    includeImages: markdownOptionFields.includeImages.optional(),
    shortenBase64Images: markdownOptionFields.shortenBase64Images.optional(),
    useMainContentOnly: markdownOptionFields.useMainContentOnly.optional(),
    pdf: z.object({
        shouldParse: z.boolean().describe(
            "Parse PDF results. When false, PDF results are skipped. " +
                "Default true.",
        ).optional(),
        start: z.number().int().min(1).describe(
            "First 1-based PDF page to parse.",
        ).optional(),
        end: z.number().int().min(1).describe(
            "Last 1-based PDF page to parse. Must be >= start.",
        ).optional(),
    }).strict().describe("PDF handling for scraped results.").optional(),
    includeFrames: markdownOptionFields.includeFrames.optional(),
    maxAgeMs: zScrapeMaxAgeMs.optional(),
    waitForMs: zWaitForMs.optional(),
    timeoutOpts: zTimeoutOpts.optional(),
}).strict();

/** POST /web/search body — the vendor mirror
 *  (docs.context.dev/api-reference/web-scraping/search, 2026-09-17). */
export const zSearchBody = z.object({
    query: z.string().min(1).max(500).describe(
        "Search query. Accepts natural language as well as Google-style " +
            "operators: site:, -site:, inurl:, intitle:, quoted phrases, OR.",
    ),
    numResults: z.number().int().min(10).max(100).describe(
        "Number of results to request and return (10-100). Default 10. " +
            "Sizes the hold: one credit per 10 results.",
    ).optional(),
    includeDomains: z.array(z.string()).describe(
        "Allowlist — only return results from these domains.",
    ).optional(),
    excludeDomains: z.array(z.string()).describe(
        "Blocklist — drop results from these domains.",
    ).optional(),
    freshness: z.enum([
        "last_24_hours",
        "last_week",
        "last_month",
        "last_year",
    ]).describe(
        "Restrict results to content published within this window.",
    ).optional(),
    country: zCountry.optional(),
    queryFanout: z.boolean().describe(
        "Expand the query into parallel variants for broader recall.",
    ).optional(),
    markdownOptions: zSearchMarkdownOptions.describe(
        "Inline Markdown scraping for each result. Set enabled: true to " +
            "activate.",
    ).optional(),
    timeoutOpts: zTimeoutOpts.optional(),
}).strict();
