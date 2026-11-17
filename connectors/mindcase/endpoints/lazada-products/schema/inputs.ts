import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `lazada/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/lazada/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLazadaProductsBody = z.object({
    query: z.string()
        .describe("Search Query."),
    country: z.enum(["id", "my", "ph", "sg", "th", "vn"])
        .describe(
            "Lazada marketplace to search. Lazada runs in six Southeast Asian countries. Example: Singapore (sg) searches lazada.sg.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["popularity", "priceasc", "pricedesc"])
        .describe("Sort By to use. Best match by default.")
        .optional(),
    minPrice: z.number().int().min(0)
        .describe("Min Price as a whole number.")
        .optional(),
    maxPrice: z.number().int().min(0)
        .describe("Max Price as a whole number.")
        .optional(),
}).strict();
