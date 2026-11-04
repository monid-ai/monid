import { z } from "zod";

/**
 * POST /api/v1/use_skill body — Edge OpenAPI 3.1
 * (https://getedge.cc/api/v1/openapi.json, 2026-11-03). Mirror carries
 * optionality only (D25): `skill` required, the rest optional. Length
 * caps (skill/source 200, request_id 32, version 80 — server-side checks)
 * live at the binding. `additionalProperties: false` upstream.
 */
export const zEdgeUseSkillBody = z.strictObject({
    skill: z.string().describe(
        "Skill name exactly as Edge /find_skill returned it, e.g. " +
            "'cold-email-sequence-generator'.",
    ),
    source: z.string().describe(
        "Repository the skill comes from, owner/repo, exactly as Edge " +
            "/find_skill returned it, e.g. 'onewave-ai/claude-skills'.",
    ).optional(),
    request_id: z.string().describe(
        "The `request_id` from the Edge /find_skill call that returned " +
            "this skill.",
    ).optional(),
    version: z.string().describe(
        "Optional: a scanned version (commit or content hash prefix) to " +
            "pin. Nothing loads if the current scanned version differs.",
    ).optional(),
});
