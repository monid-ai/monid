import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `homedepot/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/homedepot/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zHomedepotProductsBody = z.object({
    url: z.string()
        .describe(
            "Home Depot product page URL (homedepot.com/p/.../<itemId>).",
        ),
    zipCode: z.string()
        .describe(
            "5-digit US zip code; price and stock come from the Home Depot store nearest to it (default 30339, Atlanta).",
        )
        .optional(),
}).strict();
