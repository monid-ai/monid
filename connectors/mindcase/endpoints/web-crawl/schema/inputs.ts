import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `web/crawl` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/web/crawl). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWebCrawlBody = z.object({
    url: z.string()
        .describe(
            "The page to start from, like https://docs.example.com. Links are followed from here.",
        ),
    maxPages: z.number().int().min(1).max(1000)
        .describe("How many pages to crawl. Defaults to 50; at most 1,000.")
        .optional(),
    includePaths: z.array(z.string())
        .describe("Only crawl paths that match, like /blog/* or /docs/*.")
        .optional(),
    excludePaths: z.array(z.string())
        .describe("Skip paths that match, like /tag/* or /author/*.")
        .optional(),
}).strict();
