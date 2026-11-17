import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `g2/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/g2/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zG2ProductsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    categorys: z.array(z.string())
        .describe(
            "G2 category slugs or links, e.g. crm or https://www.g2.com/categories/project-management. Returns the ranked products in each category.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many products to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
