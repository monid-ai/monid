import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zApplySessionPathParams } from "../../schema/applicants.ts";
import { zApplyApplicationBody } from "./schema/inputs.ts";

/** POST /v1/apply/{id} — status, continue, approve-submit or stop one
 *  application. FREE. */
export default defineEndpoint({
    meta: {
        displayName: "Manage Application",
        summary:
            "Check on one application, answer its questions, approve it or stop it.",
        description: "Act on one application started by worklittle#apply, " +
            "by its `session_id`. `action: status` returns where it " +
            "stands (queued, running, awaiting_input, awaiting_submit, " +
            "completed, failed, stopped) with `next_step`. `continue` " +
            "sends `answers` when it is waiting on something only the " +
            "person knows (status awaiting_input; the questions are in " +
            "`session.questions`); the answers are saved to the " +
            "applicant so they are never asked again. `approve_submit` " +
            "submits an application held for review. `stop` stops it " +
            "before it submits. Every action is free; the application " +
            "itself is billed once by worklittle#apply. To see all of a " +
            "person's applications use worklittle#apply/profile with " +
            "`action: get`.",
        docsUrl: "https://docs.worklittle.com/jobs/api/apply-for-jobs",
        categories: ["jobs"],
    },
    endpoint: "/apply/{id}",
    request: { method: "POST", path: "/v1/apply/{id}" },
    input: {
        schema: {
            pathParams: zApplySessionPathParams,
            body: zApplyApplicationBody,
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
