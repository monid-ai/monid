import { z } from "zod";

/**
 * Body fields shared by POST /v1/resumes and POST /v1/cover-letters —
 * jobs-api `public/routes/documentGeneration.ts`, `apiResumeWriter.ts`,
 * `shared/documentOutputFormats.ts` and the MCP `create_resume` /
 * `create_cover_letter` tool schemas (2026-10-29). Mirror: optionality only
 * (D25).
 *
 * Not mirrored, on purpose: `async` (the connector always sends
 * `async: true` and polls; see the endpoint lifecycles) and the
 * `__applicant_id` / `__resume_from_applicant` internals the route deletes.
 */

/** The `profile` object the writer reads for the header (apiResumeWriter
 *  `profileFromArgs`). Loose: aliases (`linkedin`, `city`, …) ride through. */
export const zWorklittleCandidateProfile = z.looseObject({
    name: z.string().describe("Full name for the document header.")
        .optional(),
    email: z.string().describe("Contact email.").optional(),
    phone: z.string().describe("Contact phone.").optional(),
    linkedin_url: z.string().describe("LinkedIn profile URL.").optional(),
    github_url: z.string().describe("GitHub profile URL.").optional(),
    website_url: z.string().describe("Personal site or portfolio URL.")
        .optional(),
    location_city: z.string().describe("Candidate's city.").optional(),
    location_state: z.string().describe("Candidate's state or region.")
        .optional(),
    location_country: z.string().describe("Candidate's country.")
        .optional(),
    years_experience: z.string().describe(
        "Years of experience, e.g. '12'. Long careers may get a two-page " +
            "resume.",
    ).optional(),
});

/** Free-form job description for a job that is not in Worklittle. */
export const zWorklittleJobContext = z.looseObject({
    title: z.string().describe("Job title.").optional(),
    company: z.string().describe("Employer name.").optional(),
    location: z.string().describe("Job location.").optional(),
    description: z.string().describe(
        "The posting text; its keywords steer the tailoring.",
    ).optional(),
});

export const zWorklittleDocumentBody = z.object({
    resume_text: z.string().describe(
        "The candidate's current resume as plain text, INCLUDING the " +
            "contact line (name, email, phone, links). The only facts the " +
            "document may use; nothing is invented.",
    ).optional(),
    applicant_id: z.string().describe(
        "A Worklittle applicant id: write from that person's saved resume " +
            "and contact details instead of resume_text. resume_text, when " +
            "also sent, wins as the newer resume.",
    ).optional(),
    profile: zWorklittleCandidateProfile.describe(
        "Contact details for the header when resume_text lacks them.",
    ).optional(),
    job_id: z.string().describe(
        "The target job's id from worklittle#jobs/search. Worklittle reads " +
            "its title, employer, location and posting text to tailor the " +
            "document.",
    ).optional(),
    job_context: zWorklittleJobContext.describe(
        "The target job described inline, for a job with no Worklittle " +
            "id. Fields set here win over what job_id supplies.",
    ).optional(),
    company: z.string().describe(
        "Target employer, when there is no job_id. Overrides the job's own " +
            "employer name.",
    ).optional(),
    role: z.string().describe(
        "Target role title, when there is no job_id. Overrides the job's " +
            "own title.",
    ).optional(),
    instructions: z.string().describe(
        "Extra direction for the writer (at most 2000 characters are " +
            "used), e.g. 'emphasize people management'.",
    ).optional(),
    draft: z.boolean().describe(
        "true: a draft that leaves [ ] gaps where facts are missing instead " +
            "of failing on thin input. Same price.",
    ).optional(),
    formats: z.array(z.enum(["html", "pdf", "docx"])).describe(
        "Which files to return (default html and pdf). pdf and docx come " +
            "base64-encoded.",
    ).optional(),
    format: z.enum(["html", "pdf", "docx"]).describe(
        "Single-format alias: html, pdf (adds html) or docx (adds html). " +
            "Ignored when formats is set.",
    ).optional(),
});
