import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `web/scrape` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/web/scrape). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWebScrapeBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Web pages or PDF links to scrape, up to 1,000 per request. Failed pages are returned with an error and not charged.",
        )
        .optional(),
    query: z.string()
        .describe(
            "Keyword to search the web for. The top results are fetched and converted to Markdown.",
        )
        .optional(),
    maxResults: z.number().int().max(20)
        .describe(
            "How many search results to scrape. Defaults to 10; at most 20.",
        )
        .optional(),
}).strict();
