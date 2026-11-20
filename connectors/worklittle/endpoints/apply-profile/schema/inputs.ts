import { z } from "zod";
import {
    zWorklittleApplicantFields,
    zWorklittleNewApplicant,
    zWorklittleResumeFile,
} from "../../../schema/applicants.ts";

/**
 * POST /v1/apply/profile body — the person being applied for, in one route
 * (jobs-api `routes/applyApi.ts` `handleApplicantAction`, 2026-10-30):
 * - save without applicant_id: create (name, email and a resume required;
 *   409 APPLICANT_EXISTS for an email that already has one);
 * - save with applicant_id: update the sent fields; `resume_file` replaces
 *   the resume;
 * - get: the profile plus `applications` and employer `emails`;
 * - delete: erase them (409 while an application is running).
 * Loose profile objects: the route accepts every PATCH /account/profile
 * alias. `auto_apply` is refused here: it applies and bills later, outside
 * any Monid run.
 */
const settings = {
    auto_apply: z.never().describe(
        "Not available through Monid: auto-apply bills outside a run.",
    ).optional(),
    auto_submit: z.boolean().describe(
        "Default true: submit as soon as the form is filled. false: hold " +
            "each application for approval.",
    ).optional(),
    tailor_resume: z.boolean().describe(
        "Default true: tailor their resume to each job.",
    ).optional(),
    max_per_company: z.number().int().min(1).max(10).describe(
        "Most applications per company per 30 days (default 3).",
    ).optional(),
};
const applicantId = z.string().min(1).describe(
    "Their applicant_id, returned by `action: save` (also emailed to them).",
);
const resumeFile = zWorklittleResumeFile.describe(
    "Their resume file (PDF, Word or text), base64-encoded.",
);

export const zApplicantBody = z.union([
    zWorklittleNewApplicant.extend({
        action: z.literal("save").describe(
            "Create or update the applicant.",
        ),
        applicant_id: applicantId.optional(),
        resume_file: resumeFile.optional(),
        resume_text: z.string().describe(
            "Their resume as plain text, when there is no file.",
        ).optional(),
        ...settings,
    }),
    z.looseObject({
        action: z.literal("save"),
        applicant_id: applicantId,
        name: z.string().describe("Full name.").optional(),
        email: z.string().describe(
            "New real email address; employer emails are forwarded there " +
                "from now on.",
        ).optional(),
        resume_file: resumeFile.describe("Replaces their resume.").optional(),
        ...zWorklittleApplicantFields,
        ...settings,
    }),
    z.strictObject({
        action: z.literal("get").describe(
            "Read the profile, their applications and employer emails.",
        ),
        applicant_id: applicantId,
    }),
    z.strictObject({
        action: z.literal("delete").describe(
            "Erase their profile and resumes.",
        ),
        applicant_id: applicantId,
    }),
]);
