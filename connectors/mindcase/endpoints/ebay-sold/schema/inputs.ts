import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ebay/sold` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ebay/sold). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zEbaySoldBody = z.object({
    keywords: z.string()
        .describe(
            "Product words a buyer would type, e.g. 'nintendo switch oled'. One search per run. Listings of a different model than the one you name (iPhone 12 for 'iphone 13') are left out. A web address is not accepted.",
        ),
    marketplace: z.enum([
        "com",
        "co.uk",
        "de",
        "fr",
        "it",
        "es",
        "ca",
        "com.au",
        "nl",
        "at",
        "ch",
        "ie",
        "pl",
        "com.hk",
        "com.my",
        "ph",
        "com.sg",
    ])
        .describe(
            "Which eBay site to search. Prices come in that site's currency, and condition and location labels in its language. eBay.com by default.",
        )
        .optional(),
    days: z.number().int().min(1)
        .describe(
            "Only sales from the last N days (whole days, UTC). Last 30 days by default; eBay keeps about 90 days of sold listings.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many sold listings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
