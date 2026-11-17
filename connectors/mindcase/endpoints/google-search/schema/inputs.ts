import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google/search` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google/search). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleSearchBody = z.object({
    queries: z.string()
        .describe(
            "A Google search query or full search URL. Supports operators like site:, OR, intitle:, etc.",
        ),
    maxPages: z.number().int()
        .describe(
            "Number of Google result pages to scrape (~10 organic results per page). Use 0 for all. Google itself returns at most ~10 pages (~100 results) per query, so higher values won't return more.",
        )
        .optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Earliest result date. Leave blank for no lower bound. Format YYYY-MM-DD.",
        )
        .optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Latest result date. Leave blank for no upper bound. Format YYYY-MM-DD.",
        )
        .optional(),
    country: z.string()
        .describe(
            "Country to search from (uses google.<tld> domain). Defaults to US (google.com). Accepts one of 240 values; list them with GET https://api.mindcase.co/v1/data/google/search?expand=options.",
        )
        .optional(),
    searchLanguage: z.enum([
        "ar",
        "bg",
        "ca",
        "cs",
        "da",
        "de",
        "el",
        "en",
        "es",
        "et",
        "fi",
        "fr",
        "hr",
        "hu",
        "id",
        "is",
        "it",
        "iw",
        "ja",
        "ko",
        "lt",
        "lv",
        "nl",
        "no",
        "pl",
        "pt",
        "ro",
        "ru",
        "sk",
        "sl",
        "sr",
        "sv",
        "tr",
        "zh-CN",
        "zh-TW",
    ])
        .describe("Language of search results (e.g. only German pages).")
        .optional(),
    site: z.string()
        .describe("Limit to a specific site (e.g. example.com).")
        .optional(),
    relatedToSite: z.string()
        .describe(
            "Find pages related to a specific site (e.g. example.com). Ignored if Site Filter is set.",
        )
        .optional(),
    fileTypes: z.array(z.string())
        .describe("Filter to specific file types (e.g. pdf, doc).")
        .optional(),
}).strict();
