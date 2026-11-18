import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zApplicantBody } from "./schema/inputs.ts";

/** POST /v1/apply/profile — the person's application profile: save, get or
 *  delete. Monid path `/apply/profile` (it only exists for applying). FREE. */
export default defineEndpoint({
    meta: {
        displayName: "Application Profile",
        summary:
            "The profile applications are filled from: save it (name, email, resume), see it with their applications and employer emails, update or delete it.",
        description: "The application profile Worklittle fills every " +
            "form from, one per person. " +
            "`action: save` with their full name, real email address and " +
            "resume (resume_file or resume_text), plus any profile field " +
            "you know (phone, city, country, links, current title, work " +
            "authorization, visa status, desired salary, about_you), " +
            "creates them and returns `applicant_id`: save it with the " +
            "person and pass it to worklittle#apply. `save` with an " +
            "`applicant_id` updates only the fields sent, and " +
            "`resume_file` replaces their resume; never create a second " +
            "applicant for a change. One applicant per email: an email " +
            "that already has one answers 409 APPLICANT_EXISTS and the id " +
            "is emailed to that person. `action: get` returns their " +
            "profile with every application (job, employer, status) and " +
            "the emails employers sent them (interview invites, replies). " +
            "`action: delete` erases their profile and resumes. Free.",
        docsUrl: "https://docs.worklittle.com/jobs/api/apply-for-jobs",
        categories: ["jobs"],
        notes: [
            "Create an applicant only for a person who wants you to " +
            "apply for them, with their own name, email and resume.",
            "Delete answers 409 while one of their applications is " +
            "running; stop it with worklittle#apply/{id} first.",
        ],
    },
    endpoint: "/apply/profile",
    request: { method: "POST", path: "/v1/apply/profile" },
    input: { schema: { body: zApplicantBody } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
