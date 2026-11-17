import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `autozone/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/autozone/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAutozoneProductsBody = z.object({
    url: z.string()
        .describe(
            "An AutoZone category page URL, e.g. https://www.autozone.com/brakes-and-traction-control/brake-pads. Open any category on autozone.com and paste its address.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
