import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `stockx/products` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/stockx/products). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zStockxProductsBody = z.object({
    listing_url: z.string()
        .describe(
            "A StockX listing page URL: a brand page (https://stockx.com/brands/adidas) or a search results page (https://stockx.com/search?s=jordan%201). Brand pages also carry the 12-month market statistics; search pages do not.",
        )
        .optional(),
    query: z.string()
        .describe(
            "A keyword to search StockX for, e.g. 'jordan 1 chicago'. We build the search URL for you, no need to paste one. Relevance-ranked, so it drops roughly 30-40% of a brand; use a brand page as the Listing URL for a full catalog.",
        )
        .optional(),
    urls: z.array(z.string())
        .describe(
            "One or more StockX product URLs, e.g. https://stockx.com/air-jordan-1-retro-high-og-chicago-reimagined-lost-and-found. One per line.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Number of products to return from a brand page or a search. Use 0 for all. Ignored when you pass product URLs.",
        )
        .optional(),
    country_code: z.string()
        .describe(
            "Shopping region. Scopes the StockX market the asks and bids come from. Prices are quoted in USD regardless. Accepts one of 198 values; list them with GET https://api.mindcase.co/v1/data/stockx/products?expand=options.",
        )
        .optional(),
}).strict();
