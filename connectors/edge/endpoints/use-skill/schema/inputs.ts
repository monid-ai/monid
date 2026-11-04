import { z } from "zod";

/**
 * POST /api/v1/use_skill body — Edge OpenAPI 3.1
 * (https://getedge.cc/api/v1/openapi.json, 2026-11-03). `skill`
 * required, the rest optional. Vendor-stated single-field bounds stay in
 * the mirror (server-side checks): non-empty strings, `skill` and
 * `source` at most 200 characters, `request_id` 32, `version` 80.
 * `additionalProperties: false` upstream.
 */
export const zEdgeUseSkillBody = z.strictObject({
    skill: z.string().min(1).max(200).describe(
        "Skill name exactly as Edge /find_skill returned it, e.g. " +
            "'cold-email-sequence-generator'.",
    ),
    source: z.string().min(1).max(200).describe(
        "Repository the skill comes from, owner/repo, exactly as Edge " +
            "/find_skill returned it, e.g. 'onewave-ai/claude-skills'.",
    ).optional(),
    request_id: z.string().min(1).max(32).describe(
        "The `request_id` from the Edge /find_skill call that returned " +
            "this skill.",
    ).optional(),
    version: z.string().min(1).max(80).describe(
        "Optional: a scanned version (commit or content hash prefix) to " +
            "pin. Nothing loads if the current scanned version differs.",
    ).optional(),
});
