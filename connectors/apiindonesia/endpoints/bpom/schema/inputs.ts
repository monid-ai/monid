import { z } from "zod";

/**
 * GET /api/v1/bpom — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zBpomQueryParams = z.strictObject({
    q: z.string().min(2).describe(
        "Product name, brand or NIE, at least 2 characters, e.g. 'paracetamol'.",
    ),
});
