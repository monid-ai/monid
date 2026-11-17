import { z } from "zod";

/**
 * GET /api/v1/lei — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zLeiQueryParams = z.strictObject({
    q: z.string().describe(
        "Words from the entity name, e.g. 'pertamina'.",
    ).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "NULL"]).describe(
        "Entity status.",
    ).optional(),
    registration_status: z.string().describe(
        "LEI registration status, e.g. 'ISSUED' or 'LAPSED'.",
    ).optional(),
    kota: z.string().describe(
        "Part of the city on the legal or HQ address, e.g. 'surabaya'.",
    ).optional(),
    provinsi: z.string().describe(
        "ISO 3166-2 code (e.g. 'ID-JK') or province name.",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Page to retrieve. Defaults to 1.",
    ).optional(),
    per_page: z.number().int().min(1).max(100).describe(
        "Results per page, 1-100. Defaults to 20.",
    ).optional(),
});
