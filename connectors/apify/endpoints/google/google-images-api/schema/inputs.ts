import { z } from "zod";

/**
 * johnvc/google-images-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~google-images-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleImagesApiBody = z.object({
    queries: z.array(z.string()).describe(
        "Provide one or more image search queries, for example 'golden retriever puppy' or 'eiffel tower at night'. Each query is searched independently and billed per image returned.",
    ),
    maxResultsPerQuery: z.number().int().min(1).max(1000).describe(
        "Set how many images to return per query. Default 100. Values below 50 are raised to 50, the smallest page the upstream API bills as a single unit, so you receive 50 images rather than paying the same for fewer. The Actor pulls just enough pages to reach this count, then stops early when a query r...",
    ).optional(),
    gl: z.string().describe(
        "Set the two-letter country code for result localization, for example 'us', 'gb', 'de'. Defaults to 'us'.",
    ).optional(),
    hl: z.string().describe(
        "Set the two-letter interface language code for results, for example 'en', 'es', 'de'. Defaults to 'en'.",
    ).optional(),
});
