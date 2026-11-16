import { z } from "zod";

/**
 * johnvc/apple-app-store-reviews-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~apple-app-store-reviews-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zAppleAppStoreReviewsApiBody = z.object({
    product_ids: z.array(z.string()).describe(
        "Numeric Apple App Store product IDs (e.g. ['534220544', '363590051']). Find each ID in the App Store URL: apps.apple.com//app//id. Multiple IDs are fetched sequentially in one run. Either this or app_name must be provided.",
    ).optional(),
    app_name: z.string().describe(
        "Free-form Apple app name to look up automatically (e.g. 'netflix', 'spotify', 'todoist'). If product_ids is empty, the actor calls the App Store search engine first and reviews the top match. Convenient for AI agents that only know an app by name. Use product_ids for exact targeting.",
    ).optional(),
    country: z.enum([
        "us",
        "gb",
        "ca",
        "au",
        "nz",
        "ie",
        "in",
        "sg",
        "ph",
        "my",
        "de",
        "fr",
        "es",
        "it",
        "nl",
        "be",
        "at",
        "ch",
        "se",
        "no",
        "dk",
        "fi",
        "pt",
        "pl",
        "cz",
        "gr",
        "hu",
        "ro",
        "tr",
        "ru",
        "ua",
        "il",
        "ae",
        "sa",
        "eg",
        "za",
        "ng",
        "ke",
        "jp",
        "kr",
        "cn",
        "tw",
        "hk",
        "th",
        "id",
        "vn",
        "br",
        "mx",
        "ar",
        "cl",
        "co",
        "pe",
    ]).describe(
        "Two-letter Apple country store code (e.g. 'us', 'gb', 'jp'). Drives both the storefront and the locale of review text and dates. Defaults to 'us'.",
    ).optional(),
    sort: z.enum([
        "mostrecent",
        "mosthelpful",
        "mostfavorable",
        "mostcritical",
    ]).describe(
        "Order reviews by recency, helpfulness votes, or rating polarity. Note: applies to iOS apps only. macOS apps always return reviews in most-recent order regardless of this setting.",
    ).optional(),
    max_reviews: z.number().int().min(0).max(10000).describe(
        "Hard cap on reviews returned per product ID. Default 100. Set 0 for unlimited (internally capped at 50 pages, about 1250 reviews on iOS or 500 on macOS). Pages contain about 25 reviews each on iOS and 10 on macOS.",
    ).optional(),
    start_page: z.number().int().min(1).max(500).describe(
        "Page number to start paginating from (1-based). Useful for resuming a long run. Defaults to 1.",
    ).optional(),
    include_macos: z.boolean().describe(
        "Set false to skip macOS apps entirely (no reviews pushed, no charges incurred for any macOS product_id). Defaults to true (iOS and macOS both included).",
    ).optional(),
    normalize_dates: z.boolean().describe(
        "Emit a review_date_iso field alongside the locale-formatted review_date (e.g. '2021-06-02' alongside 'Jun 02, 2021'). Best-effort parsing; falls back to null when the source format is unfamiliar. Defaults to true.",
    ).optional(),
    parse_helpfulness: z.boolean().describe(
        "Extract integer helpful_count and total_helpful_count fields from the prose 'X out of Y customers found this review helpful' string. Defaults to true.",
    ).optional(),
    output_file: z.string().describe(
        "Optional filename to save a local JSON copy of the API response. Used during local testing only; ignored when running on the Apify platform. Auto-generated if blank.",
    ).optional(),
});
