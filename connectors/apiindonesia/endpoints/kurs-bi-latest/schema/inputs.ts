import { z } from "zod";

/**
 * GET /api/v1/kurs-bi/latest — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zKursBiLatestQueryParams = z.strictObject({
    currencies: z.string().describe(
        "Comma-separated ISO 4217 codes, e.g. 'USD,EUR,SGD'.",
    ).optional(),
});
