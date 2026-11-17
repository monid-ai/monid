import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ebay/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ebay/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zEbayListingsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all.")
        .optional(),
    marketplace: z.enum([
        "ebay.com",
        "ebay.co.uk",
        "ebay.de",
        "ebay.fr",
        "ebay.it",
        "ebay.es",
        "ebay.ca",
        "ebay.com.au",
        "ebay.nl",
        "ebay.at",
        "ebay.ch",
        "ebay.ie",
        "ebay.pl",
        "ebay.com.hk",
        "ebay.com.my",
        "ebay.ph",
        "ebay.com.sg",
    ])
        .describe("Marketplace to use. ebay.com 🇺🇸 (USD) by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many listings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
