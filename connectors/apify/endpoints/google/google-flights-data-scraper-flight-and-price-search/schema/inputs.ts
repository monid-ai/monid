import { z } from "zod";

/**
 * johnvc/Google-Flights-Data-Scraper-Flight-and-Price-Search — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~Google-Flights-Data-Scraper-Flight-and-Price-Search/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleFlightsDataScraperFlightAndPriceSearchBody = z.object({
    departure_id: z.string().describe(
        "Departure airport code(s), comma-separated for multiple (e.g., 'LAX', 'JFK', 'CDG,ORY'). Required for one-way and round-trip searches. Not used for multi-city trips.",
    ).optional(),
    arrival_id: z.string().describe(
        "Arrival airport code(s), comma-separated for multiple (e.g., 'JFK', 'SFO', 'LAX,SEA'). Required for one-way and round-trip searches. Not used for multi-city trips.",
    ).optional(),
    outbound_date: z.string().describe(
        "Departure date in YYYY-MM-DD format (e.g., '2025-11-25'). Required for one-way and round-trip searches. Not used for multi-city trips.",
    ).optional(),
    return_date: z.string().describe(
        "Return date in YYYY-MM-DD format (e.g., '2025-11-30'). Optional, used for round-trip searches.",
    ).optional(),
    multi_city_json: z.string().describe(
        'JSON string for multi-city trips. Format: [{"departure_id":"...","arrival_id":"...","date":"..."},...]. When provided, departure_id, arrival_id, and outbound_date are not required.',
    ).optional(),
    adults: z.number().int().min(1).describe(
        "Number of adult passengers (default: 1, minimum: 1)",
    ).optional(),
    children: z.number().int().min(0).describe(
        "Number of child passengers (default: 0, minimum: 0)",
    ).optional(),
    infants: z.number().int().min(0).describe(
        "Number of infant passengers (default: 0, minimum: 0)",
    ).optional(),
    currency: z.string().describe(
        "Currency code for prices (e.g., 'USD', 'EUR', 'GBP'). Default: 'USD'",
    ).optional(),
    hl: z.enum([
        "en",
        "es",
        "fr",
        "de",
        "it",
        "pt",
        "ru",
        "ja",
        "ko",
        "zh",
        "ar",
        "hi",
        "tr",
        "pl",
        "nl",
        "sv",
        "da",
        "no",
        "fi",
        "cs",
        "hu",
        "ro",
        "el",
        "th",
        "vi",
        "id",
        "ms",
        "he",
        "uk",
    ]).describe(
        "Language code for results (e.g., 'en', 'fr', 'de', 'es'). Default: 'en'",
    ).optional(),
    gl: z.enum([
        "us",
        "uk",
        "ca",
        "au",
        "de",
        "fr",
        "es",
        "it",
        "nl",
        "pl",
        "br",
        "ru",
        "jp",
        "kr",
        "cn",
        "tw",
        "in",
        "sa",
        "tr",
        "se",
        "dk",
        "no",
        "fi",
        "cz",
        "hu",
        "ro",
        "mx",
        "ar",
        "ch",
        "at",
        "be",
        "ie",
        "nz",
        "sg",
        "my",
        "th",
        "ph",
        "id",
        "vn",
    ]).describe(
        "Country code for results (e.g., 'us', 'uk', 'fr', 'de'). Default: 'us'",
    ).optional(),
    max_price: z.number().int().min(0).describe(
        "Maximum price filter in the specified currency. Optional.",
    ).optional(),
    max_stops: z.number().int().min(0).describe(
        "Maximum number of stops (0 = direct flights only, 1 = one stop max, null = no limit). Optional.",
    ).optional(),
    airlines: z.string().describe(
        "Comma-separated list of preferred airline codes (e.g., 'UA,AA,DL'). Optional.",
    ).optional(),
    exclude_basic: z.boolean().describe(
        "If true, filters out Economy flights that include carry-on bags and free seat selection. Optional.",
    ).optional(),
    fetch_booking_options: z.boolean().describe(
        "If true, performs extra requests to retrieve detailed booking options (booking links, baggage fees, etc.). This increases API usage and is billed per booking option returned.",
    ).optional(),
    max_pages: z.number().int().min(0).describe(
        "Maximum number of pages to fetch (0 = no limit, default: 1).",
    ).optional(),
    output_file: z.string().describe(
        "Optional filename to save results. If not provided, will auto-generate based on route and parameters.",
    ).optional(),
});
