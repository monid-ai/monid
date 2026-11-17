import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `asos/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/asos/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAsosProductsBody = z.object({
    query: z.string()
        .describe(
            "A keyword to search ASOS for, e.g. 'levis 501' or 'kleid'. Plain words, not a URL. ASOS always shows its closest matches, so a misspelled keyword still returns products.",
        )
        .optional(),
    category: z.enum([
        "4209",
        "4210",
        "6456",
        "4172",
        "4174",
        "8799",
        "4169",
        "7616",
        "7078",
        "4208",
        "2640",
        "5668",
        "2637",
        "3606",
        "2641",
        "2238",
        "13210",
        "6046",
        "26091",
        "26090",
        "6458",
        "6455",
        "5775",
        "5774",
        "1314",
        "19517",
        "5034",
        "4175",
        "9265",
        "8730",
        "3630",
        "4910",
        "9263",
        "15200",
        "3602",
        "5678",
        "13632",
        "4545",
        "6519",
    ])
        .describe(
            "An ASOS category to browse, e.g. Men's Jeans. One of the listed categories; for any other ASOS category paste its page URL in ASOS URL instead.",
        )
        .optional(),
    listing_url: z.string()
        .describe(
            "An ASOS search or category page URL, e.g. https://www.asos.com/men/jeans/cat/?cid=4208 or https://www.asos.com/us/search/?q=nike+air+force+1. The country store comes from the URL (/us/, /de/, /fr/ ...; no prefix = UK). Category pages work for the categories listed under Category.",
        )
        .optional(),
    country: z.enum([
        "UK",
        "US",
        "AU",
        "DE",
        "FR",
        "IT",
        "ES",
        "NL",
        "SE",
        "DK",
        "PL",
    ])
        .describe(
            "Search and Category only. The ASOS country store to read: it sets the currency (GBP, USD, EUR, SEK, DKK, PLN, AUD), the language of product names and the size labels. United Kingdom by default.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
