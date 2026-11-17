import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `shopify/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/shopify/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zShopifyProductsBody = z.object({
    urls: z.string()
        .describe(
            "Shopify store URL to crawl all products from, or an individual product URL.",
        ),
    maxResults: z.number().int()
        .describe("Number of products to return. Use 0 for all.")
        .optional(),
}).strict();
