import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `web/search` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/web/search). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWebSearchBody = z.object({
    query: z.array(z.string())
        .describe(
            "One or more search queries, written the way you would ask a search engine. Each query returns its own ranked results.",
        ),
    maxResults: z.number().int().min(0).max(20)
        .describe(
            "How many results to return for each query, up to 20. Defaults to 10; use 0 for the maximum of 20.",
        )
        .optional(),
    country: z.string()
        .describe(
            "Two-letter country code to localise results to, e.g. us, in or gb. Leave blank for no country preference.",
        )
        .optional(),
    freshness: z.enum(["any", "day", "week", "month", "year"])
        .describe(
            "Only return pages published within this window. Pages with no published date are kept.",
        )
        .optional(),
    includeDomains: z.array(z.string())
        .describe(
            "Only return results from these domains (and their subdomains), e.g. reuters.com. Up to 20.",
        )
        .optional(),
    excludeDomains: z.array(z.string())
        .describe(
            "Never return results from these domains (and their subdomains), e.g. pinterest.com. Up to 20.",
        )
        .optional(),
}).strict();
