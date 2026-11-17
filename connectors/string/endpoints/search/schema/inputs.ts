import { z } from "zod";

/** An ISO calendar date, the form a custom `dateRange` end takes. */
const zSearchDate = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "must be an ISO calendar date such as 2026-06-30",
);

/**
 * `POST /v1/search` request body — the vendor mirror (String's own docs,
 * portal.usestring.ai/docs/api-reference/search, read 2026-10-24).
 * Optionality only, per the mirror convention: String rejects any other
 * field with a 400, so the mirror is strict; defaults documented as vendor
 * behavior are applied at the endpoint binding, not here.
 *
 * Which fields apply to which engine, tab or format is a cross-field
 * rule that cannot survive compilation; it is the endpoint's `notes`,
 * and String's own 400 enforces it.
 */
export const zSearchBody = z.object({
    query: z.string().min(1).describe(
        "The search query. Quoted phrases and `site:` work.",
    ),
    engine: z.enum([
        "google",
        "duckduckgo",
        "brave",
        "mojeek",
        "google_ai_mode",
    ]).describe(
        "Search engine to query (vendor default 'google'). " +
            "'google_ai_mode' answers with Google AI Mode's generated answer " +
            "and its sources instead of ranked results.",
    ).optional(),
    country: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "ISO 3166-1 alpha-2 code the search runs from (vendor default " +
            "'US'). Case-insensitive.",
    ).optional(),
    language: z.string().regex(/^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/).describe(
        "Results language tag, such as 'en' or 'pt-br'.",
    ).optional(),
    searchCount: z.number().int().min(1).max(300).describe(
        "Organic results wanted, 1 to 300. Google is paged, up to 36 " +
            "pages, until that many are in hand, and each page is billed as " +
            "one search. Omit it for one page of about 10 results.",
    ).optional(),
    page: z.number().int().min(1).max(30).describe(
        "The results page to start from, 1 to 30 (vendor default 1), where " +
            "page N is the page Google shows as N.",
    ).optional(),
    location: z.string().min(1).max(200).describe(
        "A place name such as 'London' or 'Austin,Texas,United States', 1 " +
            "to 200 characters. The search is sent from its country and " +
            "results are biased toward it; a name that cannot be placed is " +
            "rejected.",
    ).optional(),
    coordinates: z.object({
        latitude: z.number().min(-90).max(90).describe(
            "Latitude, -90 to 90.",
        ),
        longitude: z.number().min(-180).max(180).describe(
            "Longitude, -180 to 180.",
        ),
        radius: z.number().int().min(1).max(1_000_000).describe(
            "How precise the point is, in meters, 1 to 1,000,000 (vendor " +
                "default 5000).",
        ).optional(),
    }).strict().describe(
        "A point to search from. Wins over `location` when both are sent.",
    ).optional(),
    dateRange: z.union([
        z.enum(["hour", "day", "week", "month", "year"]),
        z.object({
            from: zSearchDate.describe(
                "First day of the range, inclusive, YYYY-MM-DD.",
            ).optional(),
            to: zSearchDate.describe(
                "Last day of the range, inclusive, YYYY-MM-DD.",
            ).optional(),
        }).strict(),
    ]).describe(
        "A publication window: 'hour', 'day', 'week', 'month' or 'year' for " +
            "the past hour through the past year, or {from, to} for a custom " +
            "range of ISO dates, inclusive, with at least one end.",
    ).optional(),
    sortBy: z.enum(["relevance", "date"]).describe(
        "'relevance' (vendor default) or 'date' for the newest results " +
            "first.",
    ).optional(),
    format: z.enum(["structured", "raw"]).describe(
        "'structured' (vendor default) for parsed results as JSON, or 'raw' " +
            "for the Google results page as HTML, one page per call.",
    ).optional(),
    searchType: z.enum([
        "web",
        "images",
        "videos",
        "shopping",
        "books",
        "places",
        "forums",
    ]).describe(
        "The Google tab to search (vendor default 'web'). 'images' answers " +
            "`images`, 'shopping' `products` and 'places' `places`; the " +
            "other tabs answer `results`.",
    ).optional(),
    safeSearch: z.boolean().describe(
        "true removes explicit results (vendor default false).",
    ).optional(),
    includeOmittedResults: z.boolean().describe(
        "true includes the results Google hides as very similar to ones " +
            "already shown (vendor default false).",
    ).optional(),
    autocorrect: z.boolean().describe(
        "false searches the query exactly as sent instead of Google's " +
            "corrected spelling (vendor default true).",
    ).optional(),
    restrictCountry: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "ISO 3166-1 alpha-2 code; keeps only pages from that country. " +
            "Unlike `country`, it does not change where the search runs " +
            "from.",
    ).optional(),
    verbatim: z.boolean().describe(
        "true matches the query's words exactly, without synonyms (vendor " +
            "default false).",
    ).optional(),
    aiOverview: z.boolean().describe(
        "true fills the AI overview Google streams in after the results " +
            "page loads, with a second fetch billed as one more search " +
            "(vendor default false). An overview already on the page is " +
            "returned without it.",
    ).optional(),
}).strict();
