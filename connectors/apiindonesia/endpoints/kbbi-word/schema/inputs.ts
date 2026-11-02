import { z } from "zod";

/**
 * GET /api/v1/kbbi/word/{word} — mirrors the published OpenAPI
 * (https://apiindonesia.id/openapi.json, read 2026-11-02). Strict: an
 * unknown key is rejected before any call, so a misspelled filter
 * cannot silently widen the result set.
 */
export const zKbbiWordPathParams = z.strictObject({
    word: z.string().min(1).describe(
        "The word to look up, e.g. 'rumah'.",
    ),
});
