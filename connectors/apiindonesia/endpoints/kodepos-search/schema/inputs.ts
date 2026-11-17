import { z } from "zod";

/**
 * GET /api/v1/kodepos/search — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zKodeposSearchQueryParams = z.strictObject({
    q: z.string().min(2).describe(
        "Village name or postal code, at least 2 characters, e.g. '40154' or " +
            "'bansir'.",
    ),
    page: z.number().int().min(1).describe(
        "Page to retrieve. Defaults to 1.",
    ).optional(),
    per_page: z.number().int().min(1).max(100).describe(
        "Results per page, 1-100. Defaults to 20.",
    ).optional(),
});
