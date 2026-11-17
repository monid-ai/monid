import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `aliexpress/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/aliexpress/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAliexpressProductsBody = z.object({
    query: z.string()
        .describe("Search Query.")
        .optional(),
    url: z.string()
        .describe("URL.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["default", "orders", "priceAsc", "priceDesc"])
        .describe("Sort By to use. Best match by default.")
        .optional(),
    country: z.enum([
        "US",
        "GB",
        "DE",
        "FR",
        "ES",
        "IT",
        "NL",
        "PL",
        "PT",
        "SE",
        "BE",
        "IE",
        "AT",
        "CH",
        "CZ",
        "GR",
        "RO",
        "HU",
        "DK",
        "NO",
        "FI",
        "CA",
        "AU",
        "NZ",
        "BR",
        "MX",
        "CL",
        "CO",
        "AR",
        "PE",
        "JP",
        "KR",
        "SG",
        "MY",
        "TH",
        "VN",
        "ID",
        "PH",
        "IN",
        "PK",
        "AE",
        "SA",
        "IL",
        "TR",
        "EG",
        "ZA",
        "NG",
        "UA",
        "KZ",
        "RU",
    ])
        .describe("Country to use. US by default.")
        .optional(),
}).strict();
