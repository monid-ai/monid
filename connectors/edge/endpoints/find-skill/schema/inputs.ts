import { z } from "zod";

/**
 * POST /api/v1/find_skill body — Edge OpenAPI 3.1
 * (https://getedge.cc/api/v1/openapi.json, 2026-11-03). Vendor-stated
 * single-field bounds stay in the mirror: `query` 3-500 characters and
 * `limit` an integer 1-5 (OpenAPI), `keywords` non-empty and at most 200
 * characters (server-side check). The server trims `query` before its
 * length check, so a whitespace-only query is a vendor 400 (data).
 * `additionalProperties: false` upstream, so the mirror is strict.
 */
export const zEdgeFindSkillBody = z.strictObject({
    query: z.string().min(3).max(500).describe(
        "The task the agent is about to do, in plain words, e.g. 'write a " +
            "cold email sequence for a B2B SaaS launch' or 'add an index " +
            "to a postgres table without locking it'. Describe the task, " +
            "not the skill name.",
    ),
    keywords: z.string().min(1).max(200).describe(
        "Optional: 2 to 8 words a skill for this task would be named " +
            "with, e.g. 'cold email sequence' or 'postgres migration'.",
    ).optional(),
    limit: z.number().int().min(1).max(5).describe(
        "Most skills to return (1-5). When omitted, up to 5 are returned.",
    ).optional(),
});
