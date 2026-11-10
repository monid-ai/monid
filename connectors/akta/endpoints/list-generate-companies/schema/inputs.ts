import { z } from "zod";

/** Akta POST /v1/list/generate/companies body (agent-docs OpenAPI,
 *  2026-10-21). `filters` is an open object on the vendor side
 *  (`additionalProperties: true`); its keys come from the Filters List
 *  endpoint. The body's `sections` field is NOT exposed (monid-services
 *  parity): it changes the per-call credits. */
export const zListGenerateBody = z.object({
    // v1 rejects an empty object ("filters needs at least one
    // condition"); a `.refine()` would not survive compilation, so the
    // bound rides `.meta()` into the compiled JSON Schema.
    filters: z.record(z.string(), z.unknown()).meta({
        description: "Structured filter conditions, keyed by the filter " +
            "keys the Filters List endpoint returns (e.g. " +
            "'industry.industry' with codes from the Industry Search " +
            "endpoint). Allowed values for a key come from the Filter " +
            "Options endpoint; pass keys and values verbatim. At least one " +
            "condition.",
        minProperties: 1,
    }),
    sort_by: z.enum([
        "relevance",
        "revenue_estimate",
        "valuation_estimate",
        "employee_range",
        "total_funding",
        "founded_year",
    ]).optional().describe("Field to sort results by. Default relevance."),
    sort_order: z.enum(["asc", "desc"]).optional().describe(
        "Sort direction. Default desc.",
    ),
    limit: z.number().int().min(1).max(500).optional().describe(
        "Maximum companies to return. Default 50, max 500.",
    ),
    offset: z.number().int().min(0).optional().describe(
        "Number of results to skip for pagination. Default 0.",
    ),
}).strict();
