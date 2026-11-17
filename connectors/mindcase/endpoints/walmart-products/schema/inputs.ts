import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `walmart/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/walmart/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWalmartProductsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    urls: z.array(z.string())
        .describe(
            "One or more Walmart search, category or product URLs. One request reads them all. Sort By and the price filters apply to search and category URLs; a product URL returns that product as it is.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum([
        "best_match",
        "price_low",
        "price_high",
        "best_seller",
        "rating_high",
        "new",
    ])
        .describe(
            "Order of the results. Best match (Walmart default) by default. With URLs, applies to search and category URLs only.",
        )
        .optional(),
    minPrice: z.number().int().min(0)
        .describe(
            "Only return products priced at or above this amount, in whole dollars. With URLs, applies to search and category URLs only.",
        )
        .optional(),
    maxPrice: z.number().int().min(0)
        .describe(
            "Only return products priced at or below this amount, in whole dollars. With URLs, applies to search and category URLs only.",
        )
        .optional(),
}).strict();
