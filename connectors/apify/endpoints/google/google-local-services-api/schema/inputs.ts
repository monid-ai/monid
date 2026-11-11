import { z } from "zod";

/**
 * johnvc/google-local-services-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~google-local-services-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleLocalServicesApiBody = z.object({
    query: z.string().describe(
        "REQUIRED (or use `queries`). The service to search for, e.g. 'plumber', 'electrician', 'hvac', 'personal injury lawyer', 'dentist', 'roofer'. Google supports a fixed list of about 109 service types; common phrasings and plurals are normalized automatically, and unsupported queries return the clos...",
    ).optional(),
    queries: z.array(z.string()).describe(
        "Provide a list of services to search in one run, e.g. ['plumber', 'electrician', 'roofer']. Each query is one Local Services Ads listing for the same location.",
    ).optional(),
    location: z.string().describe(
        "The US city or district to search in, e.g. 'Austin, TX' or 'Brooklyn, NY'. Resolved internally to the Google place ID (one billed resolution for each unique location). Google Local Services Ads cover US locations only. Leave empty if you pass `dataCid` instead.",
    ).optional(),
    dataCid: z.string().describe(
        "Advanced: the decimal Google CID of a city or district level place, e.g. '6745062158417646970' for Austin, TX. When set, `location` is ignored and no location-resolution fee is charged.",
    ).optional(),
    jobType: z.string().describe(
        "Optional subcategory of the service, e.g. 'restore_power' for electricians or 'unclog_drain' for plumbers. Narrows the listing to providers offering that specific job.",
    ).optional(),
    language: z.string().describe(
        "Two-letter language code for the results, e.g. 'en' or 'es'. Defaults to 'en'.",
    ).optional(),
    maxResultsPerQuery: z.number().int().min(1).describe(
        "Optional cap on how many businesses to return for each query (a listing typically returns up to about 20). Leave empty to return all businesses found.",
    ).optional(),
});
