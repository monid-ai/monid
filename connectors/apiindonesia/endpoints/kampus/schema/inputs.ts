import { z } from "zod";

/**
 * GET /api/v1/kampus — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zKampusQueryParams = z.strictObject({
    q: z.string().describe(
        "Name or abbreviation, e.g. 'teknologi' or 'ITB'.",
    ).optional(),
    province: z.string().describe(
        "2-digit province code, e.g. '32'.",
    ).optional(),
    regency: z.string().describe(
        "4-digit regency/city code.",
    ).optional(),
    type: z.enum([
        "universitas",
        "institut",
        "politeknik",
        "akademi",
        "sekolah_tinggi",
    ]).describe(
        "Institution type.",
    ).optional(),
    group: z.enum(["PTN", "PTS", "PTA", "PTK"]).describe(
        "Group: PTN (state), PTS (private), PTA (religious), PTK " +
            "(official/ministerial).",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Page to retrieve. Defaults to 1.",
    ).optional(),
    per_page: z.number().int().min(1).max(200).describe(
        "Results per page, 1-200. Defaults to 50.",
    ).optional(),
});
