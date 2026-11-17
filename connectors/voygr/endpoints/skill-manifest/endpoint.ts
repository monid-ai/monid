import { defineEndpoint, UsageModelKind } from "@shared/core";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";
import { zSkillManifestPathParams } from "./schema/inputs.ts";

/**
 * /skill-manifest: `GET /skills/{skill_id}/manifest`. Free. The provider
 * relay adds `X-Sub-Account`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Skill Manifest",
        summary: "Read a PlaceCall skill's manifest and slot schema.",
        description:
            "Read a skill's manifest: its `input_schema` (the slots it " +
            "takes), the intent types it supports, its event types and its " +
            "limits. When placing a call gets a 422 " +
            "`missing_slots`, the manifest says which slots to collect. " +
            "voygr#list-skills lists the skill ids.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["agentic-phone"],
        notes: [
            "Reading a manifest is free.",
            "The manifest describes VOYGR's own API. Its URL templates and " +
            "its `ask_user_webhook_url` slot do not apply here: a running " +
            "call's questions arrive in `pending_questions` on " +
            "voygr#get-call, and voygr#answer-call answers them.",
        ],
    },
    endpoint: "/skill-manifest",
    request: { method: "GET", path: "/skills/{skill_id}/manifest" },
    input: { schema: { pathParams: zSkillManifestPathParams } },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
});
