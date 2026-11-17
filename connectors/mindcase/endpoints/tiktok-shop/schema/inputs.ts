import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok/shop` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok/shop). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokShopBody = z.object({
    keywords: z.string()
        .describe(
            "Product search query to run on TikTok Shop (e.g. phone case, wireless earbuds).",
        ),
    productsPerSearch: z.number().int().min(1).max(10000)
        .describe(
            "Number of products to return. Use 0 for all. Capped at 10,000 per search.",
        )
        .optional(),
}).strict();
