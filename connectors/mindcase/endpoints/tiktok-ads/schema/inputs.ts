import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/ads` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/ads). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokAdsBody = z.object({
    query: z.string()
        .describe("Search Query.")
        .optional(),
    advertiser: z.string()
        .describe("Advertiser.")
        .optional(),
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all.")
        .optional(),
    country: z.enum([
        "AT",
        "BE",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "HU",
        "IS",
        "IE",
        "IT",
        "LV",
        "LI",
        "LT",
        "LU",
        "MT",
        "NL",
        "NO",
        "PL",
        "PT",
        "RO",
        "SK",
        "SI",
        "ES",
        "SE",
        "CH",
        "GB",
    ])
        .describe(
            "Country whose TikTok Ad Library to search. TikTok publishes its ad library only for the EU/EEA, Switzerland and the United Kingdom. Germany (DE) by default. Example: France (FR).",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many ads to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
