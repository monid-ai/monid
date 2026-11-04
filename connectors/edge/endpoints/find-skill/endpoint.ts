import { defineEndpoint } from "@shared/core";
import { zEdgeFindSkillBody } from "./schema/inputs.ts";

/**
 * POST /api/v1/find_skill — rank public agent skills for one task.
 *
 * Free: usage falls back to the provider's FREE model.
 */
export default defineEndpoint({
    meta: {
        displayName: "Edge Find Skill",
        summary: "Find the best expert skill (SKILL.md workflow) for a " +
            "task — free.",
        description: "Find the best expert skill for the task an agent is " +
            "about to do. Pass the task in plain words — how to do X, an " +
            "expert workflow or playbook for Y, best practice for Z (cold " +
            "email sequences, postgres migrations, pitch decks, SEO " +
            "audits, Playwright tests, security reviews, and thousands " +
            "more) — and Edge searches about 130,000 public agent skills, " +
            "ranks them for that exact task, and returns up to 5 " +
            "security-reviewed skills. Each skill carries `source` " +
            "(owner/repo), `skill` (name), what it does, `fit_score` " +
            "(estimated probability it helps this task, 0-1), install " +
            "count, and its pinned SKILL.md URL. `recommendation.strength` " +
            "says what to do: `pick` (load the named skill first), " +
            "`shortlist` (load one only if it clearly fits), `none` " +
            "(nothing reviewed fits), or `routine` (no specialist skill " +
            "needed). Keep `request_id`, `source` and `skill`, and pipe " +
            "them into Edge /use_skill, also free, to load the " +
            "instructions.",
        docsUrl: "https://getedge.cc/api/v1/openapi.json",
        categories: ["agent-skills"],
        notes: [
            "Ranking takes 3 to 15 seconds.",
        ],
    },
    request: { method: "POST", path: "/find_skill" },
    input: {
        schema: {
            body: zEdgeFindSkillBody.extend({
                query: zEdgeFindSkillBody.shape.query.min(3).max(500),
                keywords: zEdgeFindSkillBody.shape.keywords.unwrap().min(1)
                    .max(200).optional(),
                limit: zEdgeFindSkillBody.shape.limit.unwrap().min(1).max(5)
                    .optional(),
            }),
        },
    },
});
