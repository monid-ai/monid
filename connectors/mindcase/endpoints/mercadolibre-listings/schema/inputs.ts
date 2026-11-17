import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `mercadolibre/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/mercadolibre/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zMercadolibreListingsBody = z.object({
    query: z.string()
        .describe("Search Query."),
    country: z.enum(["MX", "AR", "BR", "EC", "CL", "CO", "PE", "UY", "VE"])
        .describe("The MercadoLibre country marketplace to search."),
    maxResults: z.number().int()
        .describe(
            "How many listings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    condition: z.enum(["any", "new", "used", "refurbished"])
        .describe(
            "Only new, used or refurbished listings. Any (default) keeps all.",
        )
        .optional(),
    sortBy: z.enum(["relevance", "price_asc", "price_desc"])
        .describe("Sort By to use. Relevance (default) by default.")
        .optional(),
}).strict();
