import { z } from "zod";

/**
 * GET /api/v1/cuaca/search — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zCuacaSearchQueryParams = z.strictObject({
    q: z.string().min(2).describe(
        "Place name, e.g. 'bandung'.",
    ),
});
