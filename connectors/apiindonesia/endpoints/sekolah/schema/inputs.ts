import { z } from "zod";

/**
 * GET /api/v1/sekolah — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zSekolahQueryParams = z.strictObject({
    q: z.string().min(2).describe(
        "Exact NPSN or school-name prefix, at least 2 characters, e.g. 'SMA " +
            "NEGERI 1 BANDUNG'.",
    ).optional(),
    provinsi_id: z.string().describe(
        "2-digit province code, e.g. '32'.",
    ).optional(),
    kabupaten_id: z.string().describe(
        "4-digit regency/city code, e.g. '3273'.",
    ).optional(),
    district_id: z.string().describe(
        "District (kecamatan) id, e.g. '327319'.",
    ).optional(),
    jenis: z.enum(["SD", "SMP", "SMA", "SMK", "SLB"]).describe(
        "School level.",
    ).optional(),
    status: z.enum(["Negeri", "Swasta"]).describe(
        "Negeri (state) or Swasta (private).",
    ).optional(),
    accreditation: z.string().describe(
        "Accreditation grade, e.g. 'A'.",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Page to retrieve. Defaults to 1.",
    ).optional(),
    per_page: z.number().int().min(1).max(200).describe(
        "Results per page, 1-200. Defaults to 50.",
    ).optional(),
});
