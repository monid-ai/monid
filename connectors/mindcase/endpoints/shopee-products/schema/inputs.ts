import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `shopee/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/shopee/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zShopeeProductsBody = z.object({
    query: z.string()
        .describe("Search Query."),
    country: z.enum([
        "ID",
        "SG",
        "MY",
        "PH",
        "TH",
        "VN",
        "BR",
        "TW",
        "MX",
        "CO",
        "CL",
    ])
        .describe("Country to use."),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
