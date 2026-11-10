import { z } from "zod";

/**
 * `POST /upwork/jobs` request body: the vendor mirror, optionality only
 * (D25): the vendor's own defaults are stated in each `describe`, none is
 * applied here. The vendor's cross-field rules (`superRefine`) cannot reach
 * the JSON Schema, so each one is stated on the field it constrains; the
 * vendor answers 400 with no charge when one is broken. The text and ID
 * shapes the vendor trims or de-duplicates are mirrored without that step.
 */

const advancedText = (meaning: string) =>
    z.string().min(1).max(200).describe(
        `Advanced Search: ${meaning}, 1 to 200 characters. Cannot be ` +
            "combined with `keyword` or `searchUrl`.",
    );

const upworkNumericId = z.string().regex(/^\d{6,30}$/);

/** The vendor checks only length and well-formed Unicode here: the names
 *  are Upwork's own, with no published list to enum against. */
const upworkFilterValue = z.string().min(1).max(100);

/** The vendor's own anchor: the search root, an optional query, no
 *  fragment. The allowed parameter names and values stay in the field
 *  text. */
const upworkSearchUrlPattern =
    /^https:\/\/www\.upwork\.com\/nx\/search\/jobs\/(?:\?[^#]*)?$/;

const notWithSearchUrl = "Cannot be combined with `searchUrl`.";

export const zUpworkJobsBody = z.object({
    keyword: z.string().min(1).max(200).describe(
        'Simple search text, 1 to 200 characters, e.g. "TypeScript ' +
            'developer". Cannot be combined with the Advanced Search fields ' +
            "(`allWords`, `anyWords`, `excludedWords`, `exactPhrase`, " +
            "`titleWords`) or with `searchUrl`.",
    ).optional(),
    allWords: advancedText("results must include all of these words")
        .optional(),
    anyWords: advancedText("results must include at least one of these words")
        .optional(),
    excludedWords: advancedText("results exclude these words").optional(),
    exactPhrase: advancedText("a phrase that results must contain").optional(),
    titleWords: advancedText("words that must appear in the job title")
        .optional(),
    searchUrl: z.string().max(2048).regex(upworkSearchUrlPattern).describe(
        "Saved-search mode: a public Upwork jobs search URL that starts " +
            "with https://www.upwork.com/nx/search/jobs/ (trailing slash), " +
            "e.g. https://www.upwork.com/nx/search/jobs/?q=react&sort=" +
            "recency. At most 2048 characters, no fragment, at most 50 " +
            "query parameters of 500 characters each. Allowed query " +
            "parameters: q, ontology_skill_uid, location, timezone, hourly_rate, t, " +
            "contractor_tier, contract_to_hire, client_hires, proposals, " +
            "amount, workload, duration_v3, previous_clients, " +
            "user_location_match, visitor_pref, category2_uid, " +
            "subcategory2_uid, sort (relevance or recency), page, per_page " +
            "(10, 20, or 50), each given once. The `page` parameter is " +
            "dropped, so the search starts at the first page. In this mode " +
            "only `maxItems` and `fetchDetails` may also be given; every " +
            "other field is rejected.",
    ).optional(),
    sort: z.enum(["relevance", "recency"]).describe(
        'Result order for a built search. Vendor default "relevance". ' +
            notWithSearchUrl,
    ).optional(),
    skillIds: z.array(upworkNumericId).min(1).max(50).describe(
        "Public Upwork skill IDs, 1 to 50 values of 6 to 30 digits each. " +
            notWithSearchUrl,
    ).optional(),
    categoryIds: z.array(upworkNumericId).min(1).max(12).describe(
        "Public Upwork category IDs, 1 to 12 values of 6 to 30 digits each. " +
            notWithSearchUrl,
    ).optional(),
    subcategoryIds: z.array(upworkNumericId).min(1).max(50).describe(
        "Public Upwork subcategory IDs, 1 to 50 values of 6 to 30 " +
            "digits each. " + notWithSearchUrl,
    ).optional(),
    jobTypes: z.array(z.enum(["hourly", "fixed"])).min(1).max(2).describe(
        "Contract types to include: `hourly`, `fixed`, or both. " +
            notWithSearchUrl,
    ).optional(),
    hourlyRateMin: z.number().min(0).max(99999).describe(
        "Minimum hourly rate in US dollars, 0 to 99999. When " +
            "`hourlyRateMax` is also given it must be greater than this. " +
            notWithSearchUrl,
    ).optional(),
    hourlyRateMax: z.number().min(0).max(100000).describe(
        "Maximum hourly rate in US dollars, 0 to 100000. Must be greater " +
            "than `hourlyRateMin` when that is given. " + notWithSearchUrl,
    ).optional(),
    fixedPriceRanges: z.array(z.enum([
        "0-99",
        "100-499",
        "500-999",
        "1000-4999",
        "5000-",
    ])).min(1).max(5).describe(
        "Fixed-price budget buckets in US dollars; `5000-` means $5000 and " +
            "up. " + notWithSearchUrl,
    ).optional(),
    fixedPriceMin: z.number().min(0).max(99999).describe(
        "Custom minimum fixed price in US dollars, 0 to 99999. When " +
            "`fixedPriceMax` is also given it must be greater than this. " +
            notWithSearchUrl,
    ).optional(),
    fixedPriceMax: z.number().min(0).max(100000).describe(
        "Custom maximum fixed price in US dollars, 0 to 100000. Must be " +
            "greater than `fixedPriceMin` when that is given. " +
            notWithSearchUrl,
    ).optional(),
    experienceLevels: z.array(z.enum(["entry", "intermediate", "expert"]))
        .min(1).max(3).describe(
            "Required experience levels to include. " + notWithSearchUrl,
        ).optional(),
    clientHistory: z.array(z.enum(["0", "1-9", "10-"])).min(1).max(3)
        .describe(
            "Client hire history buckets: `0` hires, `1-9` hires, `10-` " +
                "means 10 or more. " + notWithSearchUrl,
        ).optional(),
    clientLocations: z.array(upworkFilterValue).min(1).max(50).describe(
        'Client locations as Upwork names them, e.g. "United States". ' +
            "1 to 50 values of at most 100 characters. " +
            notWithSearchUrl,
    ).optional(),
    clientTimezones: z.array(upworkFilterValue).min(1).max(50).describe(
        "Client timezones as Upwork names them. 1 to 50 values of at " +
            "most 100 characters. " + notWithSearchUrl,
    ).optional(),
    projectLengths: z.array(z.enum(["week", "month", "semester", "ongoing"]))
        .min(1).max(4).describe(
            "Hourly project lengths to include. Applies only to hourly " +
                "jobs: rejected when the filters select only fixed-price " +
                "jobs (fixed `jobTypes`, `fixedPriceRanges`, " +
                "`fixedPriceMin`, or `fixedPriceMax`, with no hourly " +
                "filter). " + notWithSearchUrl,
        ).optional(),
    hoursPerWeek: z.array(z.enum(["as_needed", "full_time"])).min(1).max(2)
        .describe(
            "Hourly workload to include. Applies only to hourly jobs: " +
                "rejected when the filters select only fixed-price jobs " +
                "(see `projectLengths`). " + notWithSearchUrl,
        ).optional(),
    contractToHire: z.boolean().describe(
        "Return contract-to-hire jobs. Vendor default false. " +
            notWithSearchUrl,
    ).optional(),
    pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)])
        .describe(
            "Upwork results per page for a built search: 10, 20, or 50. " +
                "Vendor default 10. " + notWithSearchUrl,
        ).optional(),
    maxItems: z.number().int().min(1).max(100).describe(
        "Maximum jobs to return, 1 to 100, and within your plan's item " +
            "limit. At most 10 when `fetchDetails` is true. Vendor default " +
            "10. Does not change the price.",
    ).optional(),
    fetchDetails: z.boolean().describe(
        "Fetch the full details of each returned job, including the " +
            "description text and HTML (`meta.detailStatus` reports the " +
            "outcome per job). Requires `maxItems` of 10 or less. Vendor " +
            "default false. Does not change the price.",
    ).optional(),
}).strict().describe(
    "Choose exactly one search mode. Simple search: `keyword`. Advanced " +
        "Search: one or more of `allWords`, `anyWords`, `excludedWords`, " +
        "`exactPhrase`, `titleWords` (not with `keyword`). Filter-only " +
        "search: any of the filter fields below with no text. Saved URL: " +
        "`searchUrl` alone (only `maxItems` and `fetchDetails` may " +
        "accompany it). A built search needs `keyword` or at least one " +
        "filter that is not the default (`sort` alone, `pageSize` 10 alone, " +
        "or `contractToHire` false alone do not count). The built search " +
        "URL must stay within 2048 characters.",
);
