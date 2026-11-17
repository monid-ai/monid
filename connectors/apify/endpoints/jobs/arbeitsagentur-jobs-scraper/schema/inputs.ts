import { z } from "zod";

/**
 * benthepythondev/arbeitsagentur-jobs-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/benthepythondev~arbeitsagentur-jobs-scraper/builds/default →
 * actorDefinition.input) on 2026-10-26 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zArbeitsagenturJobsScraperBody = z.object({
    keywords: z.array(z.string()).describe(
        "German or English roles, skills, occupations or employer terms to search.",
    ).optional(),
    locations: z.array(z.string()).describe(
        "Cities, regions or postcodes to search in Germany.",
    ).optional(),
    radiusKm: z.number().int().min(0).max(200).describe(
        "Maximum distance around each requested location.",
    ).optional(),
    offerType: z.enum(["1", "2", "4", "34"]).describe(
        "Type of vacancy to request from the federal jobs API.",
    ).optional(),
    workSchedules: z.array(z.enum(["vz", "tz", "snw", "ho", "mj"])).describe(
        "Optional working-time filters from the source API.",
    ).optional(),
    postedWithinDays: z.number().int().min(0).max(100).describe(
        "Only request jobs published within this many days; use 0 for any age.",
    ).optional(),
    includeTemporaryAgencies: z.boolean().describe(
        "Include vacancies posted by temporary-work agencies in source results.",
    ).optional(),
    includeDetails: z.boolean().describe(
        "Enrich each result with the full description, all locations, working time, remote status and public contacts.",
    ).optional(),
    maxResultsPerSearch: z.number().int().min(1).max(500).describe(
        "Maximum unique jobs saved for each keyword and location combination.",
    ).optional(),
    maxPagesPerSearch: z.number().int().min(1).max(100).describe(
        "Safety cap for federal jobs API pagination.",
    ).optional(),
});
