import { z } from "zod";

/**
 * GET /api/v1/ump — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zUmpQueryParams = z.strictObject({
    year: z.number().int().describe(
        "Year, e.g. 2026.",
    ).optional(),
    province_name: z.string().describe(
        "Province name, case-insensitive partial match, e.g. 'jawa barat'.",
    ).optional(),
    min_salary: z.number().describe(
        "Minimum monthly UMP in IDR.",
    ).optional(),
    max_salary: z.number().describe(
        "Maximum monthly UMP in IDR.",
    ).optional(),
});
