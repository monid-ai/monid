import { z } from "zod";

/**
 * GET /api/v1/merek/search — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zMerekSearchQueryParams = z.strictObject({
    q: z.string().min(1).describe(
        "Keyword, e.g. 'garuda'.",
    ),
    page: z.number().int().min(1).describe(
        "Page to retrieve. Defaults to 1.",
    ).optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Results per page. Defaults to 20.",
    ).optional(),
    owner: z.string().describe(
        "Filter by owner name.",
    ).optional(),
    "class": z.string().describe(
        "NICE class, e.g. '30'.",
    ).optional(),
    "in": z.enum(["owner"]).describe(
        "Set to 'owner' to search the keyword in the owner column instead of the " +
            "mark name.",
    ).optional(),
});
