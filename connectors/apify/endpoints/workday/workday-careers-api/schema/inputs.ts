import { z } from "zod";

/**
 * johnvc/workday-careers-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~workday-careers-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zWorkdayCareersApiBody = z.object({
    // curated: requestListSources editor — items are { url } request
    // objects (the actor's own prefill); the item shape is unpublished
    startUrls: z.array(z.any()).describe(
        "REQUIRED. One or more Workday careers site URLs. Every public form works: https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite, locale variants like https://intel.wd1.myworkdayjobs.com/en-US/External, and the myworkdaysite form https://wd5.myworkdaysite.com/recruiting/microchiphr/Externa...",
    ),
    searchText: z.string().describe(
        "Optional keyword query passed to the site's own job search (matches titles and descriptions the same way the search box on the careers page does). Leave empty to return every job.",
    ).optional(),
    maxJobsPerSite: z.number().int().min(0).describe(
        "Soft cap on jobs returned per start URL. 0 means all jobs on the site. Useful to keep test runs small and cheap.",
    ).optional(),
    includeDetails: z.boolean().describe(
        "When true (default), the actor opens each job's detail record to add the full description, exact ISO posted and end dates, employment type, all locations, country, and apply URL. When false, only the fast list fields are returned (title, location text, relative posted date, requisition ID) at one...",
    ).optional(),
    descriptionFormat: z.enum(["both", "html", "text"]).describe(
        "Format of the job description fields when details are fetched: 'html' keeps the original rich text, 'text' returns clean plain text, 'both' (default) returns both fields.",
    ).optional(),
    postedAfter: z.string().describe(
        "Optional ISO date filter (YYYY-MM-DD). Only jobs posted on or after this date are returned. Requires 'Fetch full job details', because the list endpoint carries only relative dates ('Posted Today', 'Posted 30+ Days Ago') and the exact date lives on the detail record. Setting this also makes the r...",
    ).optional(),
    detailConcurrency: z.number().int().min(1).max(10).describe(
        "How many job-detail requests run in parallel (1 to 10, default 5). The actor always paces list pages and backs off politely on rate limits; raise this only for very large sites.",
    ).optional(),
});
