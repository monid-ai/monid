import { z } from "zod";

/**
 * johnvc/google-hotels-search-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~google-hotels-search-scraper/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleHotelsSearchScraperBody = z.object({
    search_type: z.enum(["search", "autocomplete", "photos", "reviews"])
        .describe(
            "Select what to fetch. 'search' (default) returns hotel search results for a query, or full property details when property_token is provided (stay dates optional - they default to tomorrow for one night). 'autocomplete' returns location and hotel name suggestions for a full or partial query (requi...",
        ).optional(),
    q: z.string().describe(
        "Hotel search query (e.g., 'hotels in Paris', 'Bali Resorts', 'vacation rentals in Miami'). REQUIRED for search (unless property_token is provided) and for autocomplete. For autocomplete, partial queries like 'hotels in par' work well. Use with check_in_date and check_out_date for best search resu...",
    ).optional(),
    property_token: z.string().describe(
        "Google Hotels property token for a single specific property - obtain this from the property_token field in a previous search or autocomplete result. REQUIRED for photos and reviews modes, and for property details in search mode when q is not provided. For property details, check_in_date and check...",
    ).optional(),
    gl: z.string().describe(
        "Country code for localization (ISO 3166-1 alpha-2, e.g., 'us', 'fr', 'uk'). Optional. Defaults to 'us' if not specified. Applies to search, autocomplete, and reviews.",
    ).optional(),
    hl: z.string().describe(
        "Language code for localization (ISO 639-1, e.g., 'en', 'fr', 'es'). Optional. Defaults to 'en' if not specified. Applies to search, autocomplete, and reviews.",
    ).optional(),
    currency: z.string().describe(
        "Currency code for prices (ISO 4217, e.g., 'USD', 'EUR', 'GBP'). Optional. Defaults based on country if not specified. Applies to search and autocomplete.",
    ).optional(),
    check_in_date: z.string().describe(
        "Check-in date in YYYY-MM-DD format (e.g., '2026-12-13'). Required when searching by query (q) in search mode. Optional when fetching property details by property_token: defaults to tomorrow, and the effective date is echoed in search_parameters since returned rates depend on it. Not used by autoc...",
    ).optional(),
    check_out_date: z.string().describe(
        "Check-out date in YYYY-MM-DD format (e.g., '2026-12-14'). Recommended when searching by query (q) in search mode. Must be after check_in_date. Optional when fetching property details by property_token: defaults to check_in_date + 1 night. Not used by autocomplete, photos, or reviews.",
    ).optional(),
    adults: z.number().int().min(1).max(50).describe(
        "Number of adult guests. Optional. Defaults to 2 if not specified. Search mode only.",
    ).optional(),
    children: z.number().int().min(0).max(50).describe(
        "Number of child guests. Optional. Defaults to 0 if not specified. Search mode only.",
    ).optional(),
    children_ages: z.string().describe(
        "Comma-separated list of children ages as integers (e.g., '5,8,12'). Required if children > 0. Optional otherwise. Search mode only.",
    ).optional(),
    min_price: z.string().describe(
        "Minimum price filter in the specified currency. Optional. Must be a valid number (e.g., '50' or '99.99'). Default: '0.00' (no minimum). Search mode only.",
    ).optional(),
    max_price: z.string().describe(
        "Maximum price filter in the specified currency. Optional. Must be a valid number (e.g., '200' or '299.99'). Default: '0.00' (no maximum). Search mode only.",
    ).optional(),
    stars: z.string().describe(
        "Comma-separated list of star ratings to filter by (e.g., '3,4,5' for 3, 4, or 5 star hotels). Each value must be an integer between 1 and 5. Optional. Search mode only.",
    ).optional(),
    amenities: z.string().describe(
        "Comma-separated list of amenity IDs to filter by (integer IDs). Optional. See the Actor README for the full list of supported amenity IDs. Search mode only.",
    ).optional(),
    hotel_class: z.string().describe(
        "Comma-separated list of hotel star-class levels to filter by. Valid values: 2 (2-star), 3 (3-star), 4 (4-star), 5 (5-star). Value 1 is not supported. Example: '3,4,5' for mid-range and luxury hotels. Optional. Not compatible with vacation_rentals=true. Search mode only.",
    ).optional(),
    guest_rating: z.string().describe(
        "Minimum guest rating filter (0.0 to 5.0). Optional. Must be a valid number (e.g., '4.0' or '4.5'). Default: '0.0' (no minimum). Search mode only.",
    ).optional(),
    property_type: z.string().describe(
        "Comma-separated list of property type IDs to filter by (integer IDs). Optional. See the Actor README for the full list of supported property type IDs. Search mode only.",
    ).optional(),
    vacation_rentals: z.boolean().describe(
        "Whether to include vacation rentals in search results. Optional. Defaults to false. Search mode only.",
    ).optional(),
    rental_type: z.string().describe(
        "Comma-separated list of rental type IDs to filter by (integer IDs). Only relevant when vacation_rentals is true. Optional. Search mode only.",
    ).optional(),
    bedrooms: z.number().int().min(1).max(20).describe(
        "Number of bedrooms filter for vacation rentals. Only relevant when vacation_rentals is true. Optional. Search mode only.",
    ).optional(),
    bathrooms: z.number().int().min(1).max(20).describe(
        "Number of bathrooms filter for vacation rentals. Only relevant when vacation_rentals is true. Optional. Search mode only.",
    ).optional(),
    reviews_sort_by: z.enum(["1", "2", "3", "4"]).describe(
        "Sort order for reviews mode. '1' = most helpful (default), '2' = most recent, '3' = highest score, '4' = lowest score. Only used when Search Type is 'reviews'. Optional.",
    ).optional(),
    reviews_category_token: z.string().describe(
        "Token to filter reviews by a specific review category or topic (e.g., cleanliness, service). Obtain category tokens from the reviews breakdown of a property details result. Only used when Search Type is 'reviews'. Optional.",
    ).optional(),
    max_pages: z.number().int().min(0).describe(
        "Maximum number of result pages to fetch (1-indexed). Set to 0 for no limit (fetch all available pages). Default: 1. Applies to search, photos, and reviews pagination; autocomplete always uses a single request. Results from each page are charged per the pricing events.",
    ).optional(),
    output_file: z.string().describe(
        "Optional filename to save results as JSON. If not provided, will auto-generate based on query and timestamp.",
    ).optional(),
});
