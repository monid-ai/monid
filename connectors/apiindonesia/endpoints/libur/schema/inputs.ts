import { z } from "zod";

/**
 * GET /api/v1/libur — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zLiburQueryParams = z.strictObject({
    tahun: z.number().int().describe(
        "Year, e.g. 2026. Omit for every year on file.",
    ).optional(),
    bulan: z.string().regex(/^(0[1-9]|1[0-2])$/).describe(
        "Month as two digits, '01'-'12', e.g. '12'.",
    ).optional(),
});
