import { defineEndpoint } from "@shared/core";
import { zEdgeUseSkillBody } from "./schema/inputs.ts";

/**
 * POST /api/v1/use_skill — load one skill's instructions for this task.
 *
 * Free: usage falls back to the provider's FREE model.
 */
export default defineEndpoint({
    meta: {
        displayName: "Edge Use Skill",
        summary: "Load a skill's full expert instructions for this task " +
            "— free.",
        description: "Load the full instructions of a skill Edge " +
            "/find_skill returned — its SKILL.md and supporting files as " +
            "one text (`instructions`), for the agent to follow for the " +
            "current task. Pass `source` and `skill` exactly as find_skill " +
            "returned them, plus its `request_id`. Nothing is installed. " +
            "Only skills whose exact bundle passed Edge's automated " +
            "security checks load: a blocked skill answers 403, a skill " +
            "still under review answers 409 with Retry-After, and an " +
            "unknown or unloadable one answers 404 with what to try next.",
        docsUrl: "https://getedge.cc/api/v1/openapi.json",
        categories: ["agent-skills"],
        notes: [
            "`instructions` is often 10-50 KB of text.",
        ],
    },
    request: { method: "POST", path: "/use_skill" },
    input: {
        schema: {
            body: zEdgeUseSkillBody.extend({
                skill: zEdgeUseSkillBody.shape.skill.min(1).max(200),
                source: zEdgeUseSkillBody.shape.source.unwrap().min(1)
                    .max(200).optional(),
                request_id: zEdgeUseSkillBody.shape.request_id.unwrap()
                    .min(1).max(32).optional(),
                version: zEdgeUseSkillBody.shape.version.unwrap().min(1)
                    .max(80).optional(),
            }),
        },
    },
});
