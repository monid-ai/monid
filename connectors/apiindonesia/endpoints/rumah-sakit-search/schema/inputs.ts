import { z } from "zod";

/**
 * GET /api/v1/rumah-sakit/search — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zRumahSakitSearchQueryParams = z.strictObject({
    q: z.string().min(2).describe(
        "Hospital name keyword, at least 2 characters, e.g. 'hasan sadikin'.",
    ).optional(),
    code: z.string().describe(
        "Exact SIRS hospital code, e.g. '6171011'.",
    ).optional(),
});
