import { z } from "zod";

/**
 * POST /web_search body — OpenAPI `WebSearchRequest` (Telnyx API spec
 * 2.0.0, operationId CreateWebSearch). Faithful mirror: vendor bounds
 * kept, optionality only, no `.default()` (the OpenAPI declares none).
 * `.strict()`: a misspelled key is rejected rather than silently
 * dropped (search1api #40 precedent).
 */
export const zTelnyxWebSearchBody = z.object({
    query: z.string().min(1).max(2000).describe(
        "The search query text (1–2000 characters).",
    ),
    count: z.number().int().min(1).max(100).describe(
        "Number of results to return (1–100).",
    ).optional(),
    country: z.string().min(2).max(2).describe(
        "Two-letter country code (ISO 3166-1 alpha-2) to bias results, " +
            "e.g. 'US'.",
    ).optional(),
    safesearch: z.enum(["off", "moderate", "strict"]).describe(
        "Safe search filter level.",
    ).optional(),
    freshness: z.string().max(20).describe(
        "Time-based filter for results. 'day', 'week', 'month' and " +
            "'year' are reliable; other values pass through and " +
            "unrecognised ones return unfiltered results.",
    ).optional(),
    include_domains: z.array(z.string()).max(50).describe(
        "Restrict results to these domains (bare hostnames, e.g. " +
            "'arxiv.org'). Mutually exclusive with exclude_domains.",
    ).optional(),
    exclude_domains: z.array(z.string()).max(50).describe(
        "Exclude results from these domains (bare hostnames, e.g. " +
            "'pinterest.com'). Mutually exclusive with include_domains.",
    ).optional(),
    livecrawl: z.boolean().describe(
        "When true, pages are crawled in real time for fresher content: " +
            "slower, and more likely to time out (504).",
    ).optional(),
}).strict();
