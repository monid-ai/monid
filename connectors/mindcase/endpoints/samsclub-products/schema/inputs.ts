import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `samsclub/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/samsclub/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSamsclubProductsBody = z.object({
    query: z.array(z.string())
        .describe("One or more search query. One request reads them all.")
        .optional(),
    productUrls: z.array(z.string())
        .describe("One or more product urls. One request reads them all.")
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
