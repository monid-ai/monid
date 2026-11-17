import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `ikea/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/ikea/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zIkeaProductsBody = z.object({
    urls: z.array(z.string())
        .describe(
            "IKEA product, category or search links (https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/). Each link uses its own country and language. One per line; room, offers and store pages are not supported.",
        )
        .optional(),
    queries: z.array(z.string())
        .describe(
            "Words to search IKEA for, one per line (billy bookcase, desk lamp). For links, use URLs instead.",
        )
        .optional(),
    country: z.enum([
        "us",
        "gb",
        "ca",
        "au",
        "in",
        "sg",
        "jp",
        "kr",
        "cn",
        "th",
        "my",
        "ph",
        "de",
        "fr",
        "es",
        "it",
        "nl",
        "be",
        "ch",
        "at",
        "se",
        "no",
        "dk",
        "fi",
        "ie",
        "pt",
        "pl",
        "cz",
        "hu",
        "ro",
        "mx",
        "cl",
        "co",
        "ae",
        "sa",
        "eg",
        "il",
        "jo",
        "ma",
    ])
        .describe(
            "By Keyword only. The IKEA country to search; it sets prices, currency, product range and the language of the text. United States by default. Links always use their own country.",
        )
        .optional(),
    sortBy: z.enum(["relevance", "priceLowToHigh"])
        .describe(
            "The order products are listed in for a search or category before Max Results is applied. Most relevant first by default. Has no effect on single product links.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
