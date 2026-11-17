import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-patents/patents` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-patents/patents). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGooglePatentsPatentsBody = z.object({
    query: z.string()
        .describe("Search Query."),
    assignee: z.string()
        .describe("Assignee.")
        .optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Date From as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Date To as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    dateType: z.enum(["priority", "filing", "publication"])
        .describe("Date Type to use. Publication Date by default.")
        .optional(),
    country: z.enum([
        "AR",
        "AU",
        "AT",
        "BE",
        "BR",
        "CA",
        "CN",
        "CZ",
        "DK",
        "EP",
        "FI",
        "FR",
        "DE",
        "GR",
        "HK",
        "HU",
        "IN",
        "IE",
        "IL",
        "IT",
        "JP",
        "LU",
        "MX",
        "NL",
        "NZ",
        "NO",
        "PL",
        "PT",
        "RU",
        "SG",
        "ZA",
        "KR",
        "ES",
        "SE",
        "CH",
        "TW",
        "TR",
        "GB",
        "US",
        "WO",
    ])
        .describe(
            "Patent office to search, picked by name (stored as its two-letter office code). Leave empty to search every office. Example: United States (US), European Patent Office (EP), Japan (JP).",
        )
        .optional(),
    status: z.enum(["ANY", "GRANT", "APPLICATION"])
        .describe("Status to use. Any by default.")
        .optional(),
    sortBy: z.enum(["relevance", "new", "old"])
        .describe("Sort By to use. Relevance by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many patents to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
