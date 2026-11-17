import { z } from "zod";

/**
 * GET /api/v1/hijriah/konversi — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zHijriahKonversiQueryParams = z.strictObject({
    tanggal: z.iso.date().describe(
        "Gregorian date in YYYY-MM-DD, e.g. '2026-07-11'.",
    ),
});
