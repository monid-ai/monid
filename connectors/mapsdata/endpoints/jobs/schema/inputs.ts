import { z } from "zod";

/**
 * `POST /api/v1/jobs` body — the vendor mirror of MapsData's `ScrapeCreate`
 * model (`extra="forbid"`, hence strict). Optionality only; no defaults
 * (design D25). The vendor's own defaults: `country` "us",
 * `include_variants` true, `min_reviews` 0, `dry_run` false.
 *
 * `client_id` is OMITTED on purpose: it routes a scrape between the clients
 * of a multi-client MapsData workspace, and on the hosted platform there is
 * one workspace with one client, so the field can only ever be wrong.
 */
export const zCityRef = z.strictObject({
    city: z.string().min(1).max(80).describe("City name, e.g. 'Austin'."),
    state: z.string().min(1).max(80).describe(
        "Full region name the city is in, e.g. 'Texas'. Not an abbreviation.",
    ),
});

export const zJobsBody = z.strictObject({
    query: z.string().min(1).max(300).describe(
        "One to three comma-separated canonical Google Maps categories, " +
            "e.g. 'Plumber' or 'Plumber, Electrician'. Free text is rejected " +
            "with suggestions; resolve terms with " +
            "mapsdata#categories/validate first.",
    ),
    country: z.string().describe(
        "One of us, ca, uk, au. The vendor defaults to us.",
    ).optional(),
    states: z.array(z.string()).max(200).describe(
        "Full region names for the chosen country, e.g. ['Texas']. " +
            "Abbreviations are rejected; mapsdata#regions lists the exact " +
            "strings. Omit when passing `cities`.",
    ).optional(),
    cities: z.array(zCityRef).max(50).describe(
        "Named cities instead of whole regions, up to 50.",
    ).optional(),
    total_limit: z.number().int().min(1).describe(
        "Maximum businesses to scrape. Only those with a deliverable email " +
            "are returned and billed, so expect fewer leads than this.",
    ),
    max_emails_per_company: z.number().int().min(1).describe(
        "Cap the emails kept per business. Omit for no cap.",
    ).optional(),
    min_reviews: z.number().int().min(0).describe(
        "Skip businesses with fewer Google reviews than this.",
    ).optional(),
    max_reviews: z.number().int().min(0).describe(
        "Skip businesses with more Google reviews than this.",
    ).optional(),
    list_name: z.string().max(120).describe(
        "Label for the list. Defaults to the query.",
    ).optional(),
    include_variants: z.boolean().describe(
        "Also search up to four closely related categories, which usually " +
            "finds materially more businesses. Applies to single-category " +
            "queries only. The vendor defaults to true.",
    ).optional(),
    dry_run: z.boolean().describe(
        "Validate the request against every vendor check and return the " +
            "resolved plan without starting a scrape. Free.",
    ).optional(),
});
