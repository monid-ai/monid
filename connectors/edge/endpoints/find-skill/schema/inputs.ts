import { z } from "zod";

/**
 * POST /api/v1/find_skill body — Edge OpenAPI 3.1
 * (https://getedge.cc/api/v1/openapi.json, 2026-11-03). Mirror carries
 * optionality only (D25); the vendor's bounds (query 3-500 characters,
 * limit 1-5) live at the binding in endpoint.ts. `additionalProperties:
 * false` upstream, so the mirror is strict.
 */
export const zEdgeFindSkillBody = z.strictObject({
    query: z.string().describe(
        "The task the agent is about to do, in plain words, e.g. 'write a " +
            "cold email sequence for a B2B SaaS launch' or 'add an index " +
            "to a postgres table without locking it'. Describe the task, " +
            "not the skill name.",
    ),
    keywords: z.string().describe(
        "Optional: 2 to 8 words a skill for this task would be named " +
            "with, e.g. 'cold email sequence' or 'postgres migration'.",
    ).optional(),
    limit: z.number().int().describe(
        "Most skills to return (1-5). When omitted, up to 5 are returned.",
    ).optional(),
});
