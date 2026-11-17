import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `bestbuy/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/bestbuy/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBestbuyProductsBody = z.object({
    searchQuery: z.string()
        .describe(
            "Keyword to search Best Buy for, e.g. 'airpods pro'. Results come back in Best Buy's own ranking.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "Best Buy product page URLs, e.g. https://www.bestbuy.com/site/-/6505729.p. One or more.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum([
        "Best-Match",
        "Best-Selling",
        "Best-Discount",
        "Price-Low-To-High",
        "Price-High-To-Low",
        "Customer-Rating",
        "New-Arrivals",
    ])
        .describe(
            "Order of the results. Best match (Best Buy's default) if left blank.",
        )
        .optional(),
    minPrice: z.number().int().min(0)
        .describe(
            "Only products priced at or above this, in whole US dollars, e.g. 100.",
        )
        .optional(),
    maxPrice: z.number().int().min(0)
        .describe(
            "Only products priced at or below this, in whole US dollars, e.g. 500.",
        )
        .optional(),
}).strict();
