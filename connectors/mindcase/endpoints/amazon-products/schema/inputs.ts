import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `amazon/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/amazon/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAmazonProductsBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Amazon product URLs or bare ASINs from any marketplace (amazon.com, .in, .de, …). One per line. Category/listing pages are not supported; use a keyword search instead.",
        )
        .optional(),
    keywords: z.string()
        .describe(
            "Keyword or phrase to search Amazon for (e.g. 'mechanical keyboard'). Returns the full product detail for each result, with its search rank (1 = top result).",
        )
        .optional(),
    marketplace: z.enum([
        "com",
        "in",
        "co.uk",
        "de",
        "fr",
        "it",
        "es",
        "ca",
        "com.au",
        "co.jp",
        "com.mx",
        "com.br",
    ])
        .describe(
            "Which Amazon site to search. Applies to keyword search only; URLs always use their own marketplace.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of products to return. Use 0 for all.")
        .optional(),
}).strict();
