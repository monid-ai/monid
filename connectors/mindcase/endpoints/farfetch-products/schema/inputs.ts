import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `farfetch/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/farfetch/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFarfetchProductsBody = z.object({
    listing_url: z.string()
        .describe(
            "A Farfetch designer or listing page URL, e.g. https://www.farfetch.com/shopping/men/gucci/items.aspx. Designer pages return that brand's catalog.",
        )
        .optional(),
    query: z.string()
        .describe(
            "A brand or keyword to look up, e.g. 'gucci'. We build the listing URL for you.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "One or more Farfetch product URLs, e.g. https://www.farfetch.com/shopping/men/gucci-jordaan-horsebit-loafers-item-19426833.aspx. One per line.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Number of products to return from a listing page. Use 0 for all. Ignored when you pass product URLs.",
        )
        .optional(),
}).strict();
