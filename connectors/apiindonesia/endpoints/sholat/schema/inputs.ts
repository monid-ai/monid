import { z } from "zod";

/**
 * GET /api/v1/sholat — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zSholatQueryParams = z.strictObject({
    kabupaten_id: z.string().regex(/^\d{4}$/).describe(
        "4-digit regency/city code, e.g. '3273' (Kota Bandung) or '6171' (Kota " +
            "Pontianak).",
    ),
    tanggal: z.iso.date().describe(
        "Date in YYYY-MM-DD. Defaults to today.",
    ).optional(),
});
