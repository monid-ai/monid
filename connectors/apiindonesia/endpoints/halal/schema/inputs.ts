import { z } from "zod";

/**
 * GET /api/v1/halal — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zHalalQueryParams = z.strictObject({
    q: z.string().min(2).describe(
        "Business or supervisor name, at least 2 characters, e.g. 'indomie'.",
    ),
    limit: z.number().int().min(1).max(200).describe(
        "Maximum results, 1-200. Defaults to 50.",
    ).optional(),
});
