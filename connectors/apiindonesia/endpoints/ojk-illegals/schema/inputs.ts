import { z } from "zod";

/**
 * GET /api/v1/ojk/illegals — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zOjkIllegalsQueryParams = z.strictObject({
    name: z.string().describe(
        "Entity, app or website name, e.g. 'binomo'.",
    ).optional(),
    limit: z.number().int().min(1).max(200).describe(
        "Results per page, 1-200. Defaults to 50.",
    ).optional(),
    offset: z.number().int().min(0).describe(
        "Rows to skip, for pagination.",
    ).optional(),
});
