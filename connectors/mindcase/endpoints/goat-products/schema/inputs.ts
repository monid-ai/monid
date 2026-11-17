import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `goat/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/goat/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoatProductsBody = z.object({
    listing_url: z.string()
        .describe(
            "A GOAT listing page URL: a brand page (https://www.goat.com/brand/salomon) or a search results page (https://www.goat.com/search?query=nike). Brand pages return the full catalog; searches are relevance-ranked. Any GOAT filter in the URL is honoured.",
        )
        .optional(),
    query: z.string()
        .describe(
            "A keyword to search GOAT for, e.g. 'jordan 1 chicago'. We build the search URL for you, so there's no need to paste one. Relevance-ranked, so it drops roughly 30-40% of a brand; use a brand page as the Listing URL for a full catalog.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "One or more GOAT product URLs, e.g. https://www.goat.com/sneakers/air-jordan-1-high-1985-4280. One per line.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Number of products to return from a search or brand page. Use 0 for all. Ignored when you pass product URLs.",
        )
        .optional(),
    country_code: z.string()
        .describe(
            "Shopping region. Shapes which sellers and sizes are offered and their asking prices. Regions without their own market get GOAT's global pricing (the same listings as the default). Prices are quoted in USD regardless. Accepts one of 170 values; list them with GET https://api.mindcase.co/v1/data/goat/products?expand=options.",
        )
        .optional(),
}).strict();
