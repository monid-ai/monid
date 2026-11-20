import { z } from "zod";
import {
    zWorklittleNewApplicant,
    zWorklittleResumeFile,
} from "./applicants.ts";

/**
 * Options shared by POST /v1/apply and POST /v1/apply-with-ai/batch (the
 * batch takes "the same options as apply", jobs-api
 * `handlePublicBatchApplyWithAi`) — `routes/applyWithAiBrowser.ts`
 * `startApplyWithAi` + `applyApplicant.ts` (2026-10-29). Mirror:
 * optionality only (D25).
 *
 * Not mirrored, on purpose: `use_profile` (a shared key must send false;
 * the lifecycles always do), `resume_id` (refused on a shared key),
 * `webhook_url` (a caller-chosen URL would receive another person's
 * application events through Monid's shared key), `candidate`,
 * `confirm_same_company` (legacy alias of max_per_company at its ceiling).
 */
export const zWorklittleApplyOptions = {
    resume_text: z.string().describe(
        "Their resume as plain text, when there is no file.",
    ).optional(),
    resume_file: zWorklittleResumeFile.describe(
        "Their resume file (PDF, Word or text), base64-encoded.",
    ).optional(),
    resume_pdf_base64: z.string().describe(
        "Their resume as a base64 PDF (older field; prefer resume_file).",
    ).optional(),
    resume_html: z.string().describe(
        "A ready resume for THIS job (e.g. html from worklittle#resumes) " +
            "to attach as-is instead of tailoring one.",
    ).optional(),
    cover_letter_html: z.string().describe(
        "A ready cover letter for this job (e.g. html from " +
            "worklittle#cover-letters).",
    ).optional(),
    cover_letter_pdf_base64: z.string().describe(
        "A ready cover letter as a base64 PDF.",
    ).optional(),
    auto_submit: z.boolean().describe(
        "Default true: submit as soon as the form is filled. false: stop " +
            "at awaiting_submit for the person to review, then " +
            "worklittle#apply/{id} with `action: approve_submit`.",
    ).optional(),
    tailor_resume: z.boolean().describe(
        "Default true: tailor their resume to this job before attaching " +
            "it. false: attach it unchanged.",
    ).optional(),
    max_per_company: z.number().int().describe(
        "Most applications this person may send one employer in 30 days " +
            "(1–10, default 3). Over it the call answers 409 " +
            "COMPANY_LIMIT_REACHED; raise it only with the person's consent.",
    ).optional(),
    test: z.boolean().describe(
        "true: a full practice run with no personal data, no browser and " +
            "no charge. Nothing is sent to the employer.",
    ).optional(),
};

/** Returning person: their saved applicant_id. */
export const zApplyAsExisting = {
    applicant_id: z.string().min(1).describe(
        "The person's saved applicant_id from an earlier apply (or the " +
            "email Worklittle sent them).",
    ),
};

/** First application for a person: `applicant` + a resume. */
export const zApplyAsNew = {
    applicant: zWorklittleNewApplicant.describe(
        "A person applying for the first time: at least name and email, " +
            "plus a resume (resume_file, resume_pdf_base64 or resume_text).",
    ),
};
