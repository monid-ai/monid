import { z } from "zod";

/** Shared native enrichment options; defaults are applied by the vendor. */
export const enrichmentOptions = {
    multiple_results: z.boolean().optional().describe(
        "Return multiple matches; requires enterprise permission. Default false.",
    ),
    limit: z.number().int().min(1).max(10).optional().describe(
        "Maximum matches when multiple_results=true. Vendor default 2.",
    ),
    min_confidence: z.enum(["high", "moderate", "low"]).nullable().optional(),
    titlecase: z.boolean().optional(),
    required_fields: z.string().nullable().optional(),
    include_fields: z.string().nullable().optional(),
    exclude_fields: z.string().nullable().optional(),
    pretty_print: z.boolean().optional(),
};
