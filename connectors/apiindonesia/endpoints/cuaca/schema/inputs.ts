import { z } from "zod";

/**
 * GET /api/v1/cuaca — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zCuacaQueryParams = z.strictObject({
    adm4: z.string().describe(
        "Village code, dotted or plain, e.g. '32.73.01.1001' or '6171031001'.",
    ).optional(),
    kabupaten_id: z.string().describe(
        "4-digit regency/city code, used when adm4 is not given, e.g. '3273'.",
    ).optional(),
});
