import { z } from "zod";

/**
 * Body fragments shared by the person and company enrich products (Data
 * Legion OpenAPI, docs/api-reference/openapi.json, checked 2026-10-22).
 *
 * NOT mirrored: `multiple_results` and `limit` (enterprise-only per
 * account, and every extra match bills — a single-result call is the
 * product), and `pretty_print` (whitespace only).
 */
export const zMatchControls = {
    min_confidence: z.enum(["high", "moderate", "low"]).optional().describe(
        "Minimum match confidence to accept: 'high', 'moderate', or 'low'. " +
            "A weaker match is treated as no match.",
    ),
    titlecase: z.boolean().optional().describe(
        "Format text fields (names, titles, company names, locations) in " +
            "title case. Raw fields, ids, URLs, and codes are untouched.",
    ),
    required_fields: z.string().min(1).optional().describe(
        "Comma-separated fields that must be present, else the record is " +
            "treated as no match (e.g. 'work_email,phones', " +
            "'emails.type:personal').",
    ),
    include_fields: z.string().min(1).optional().describe(
        "Comma-separated fields to return; omit for every field this " +
            "product includes.",
    ),
    exclude_fields: z.string().min(1).optional().describe(
        "Comma-separated fields to leave out. Applied after include_fields.",
    ),
};
