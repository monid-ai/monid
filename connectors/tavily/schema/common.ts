import { z } from "zod";

// Vendor mirrors: https://docs.tavily.com/documentation/api-reference/openapi.json
// Checked 2026-10-26. Defaults belong at endpoint bindings, not in mirrors.
export const zExtractionOptions = z.object({
    extract_depth: z.enum(["basic", "advanced"]).describe(
        "Basic costs 1 credit per 5 successful extractions; advanced costs 2.",
    ).optional(),
    chunks_per_source: z.number().int().min(1).max(5).describe(
        "Maximum relevant chunks per source when query/instructions are provided.",
    ).optional(),
    format: z.enum(["markdown", "text"]).describe("Extracted content format.")
        .optional(),
    include_images: z.boolean().describe(
        "Include images extracted from each page.",
    ).optional(),
    include_favicon: z.boolean().describe(
        "Include a favicon URL for each result.",
    ).optional(),
});

export const zTraversalBody = z.object({
    url: z.string().min(1).describe("Root URL to explore."),
    instructions: z.string().nullable().describe(
        "Natural-language guidance; increases mapping cost to 2 credits per 10 pages.",
    ).optional(),
    max_depth: z.number().int().min(1).max(5).describe(
        "Maximum traversal depth; vendor default 1.",
    ).optional(),
    max_breadth: z.number().int().min(1).max(500).describe(
        "Maximum links followed per page; vendor default 20.",
    ).optional(),
    limit: z.number().int().min(1).describe(
        "Maximum total pages to process; required by Monid to bound the estimate.",
    ).optional(),
    select_paths: z.array(z.string()).nullable().describe(
        "Regex patterns selecting URL paths.",
    ).optional(),
    select_domains: z.array(z.string()).nullable().describe(
        "Regex patterns selecting domains.",
    ).optional(),
    exclude_paths: z.array(z.string()).nullable().describe(
        "Regex patterns excluding URL paths.",
    ).optional(),
    exclude_domains: z.array(z.string()).nullable().describe(
        "Regex patterns excluding domains.",
    ).optional(),
    allow_external: z.boolean().describe(
        "Include external-domain links in results; vendor default true.",
    ).optional(),
    timeout: z.number().min(10).max(150).describe(
        "Operation timeout in seconds; vendor default 150.",
    ).optional(),
    include_usage: z.boolean().describe(
        "Always sent as true by Monid for credit settlement.",
    ).optional(),
});
