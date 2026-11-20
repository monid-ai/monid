import { z } from "zod";

/**
 * Applicant fragments shared by POST /v1/apply and POST /v1/apply/profile
 * — jobs-api `routes/applyApplicant.ts`
 * (`prepareApiApplicant`, `storeApplicantResumeFile`), `routes/applyApi.ts`
 * and `routes/accountProfile.ts` `remapPublicAccountPatch` (2026-10-30).
 * Mirror: optionality only (D25).
 */

/** `{filename, mime?, content_base64}` — PDF, Word or text. */
export const zWorklittleResumeFile = z.object({
    filename: z.string().min(1).describe(
        "File name with extension, e.g. 'jordan-rivera.pdf'.",
    ),
    mime: z.string().describe(
        "MIME type, e.g. application/pdf. Inferred from the name when " +
            "omitted.",
    ).optional(),
    content_base64: z.string().min(1).describe(
        "The file, base64-encoded (a data: URL prefix is accepted).",
    ),
});

/** The public profile names (same as PATCH /account/profile). Loose: the
 *  route remaps many aliases (`linkedin`, `x_url`, `you_name`, …). */
export const zWorklittleApplicantFields = {
    phone: z.string().describe("Phone number.").optional(),
    city: z.string().describe("City they live in.").optional(),
    state: z.string().describe("State or region.").optional(),
    country: z.string().describe("Country.").optional(),
    address: z.string().describe("Street address.").optional(),
    linkedin: z.string().describe("LinkedIn URL.").optional(),
    website: z.string().describe("Personal site or portfolio URL.")
        .optional(),
    github: z.string().describe("GitHub URL.").optional(),
    work_authorization: z.array(z.string()).describe(
        "ISO country codes they may work in without sponsorship, e.g. " +
            "['US'].",
    ).optional(),
    visa_status: z.string().describe("Visa status, e.g. 'needs H-1B'.")
        .optional(),
    desired_salary: z.string().describe("Desired salary, e.g. '$150k'.")
        .optional(),
    current_title: z.string().describe("Current job title.").optional(),
    current_company: z.string().describe("Current employer.").optional(),
    school: z.string().describe("School.").optional(),
    degree: z.string().describe("Degree.").optional(),
    years_experience: z.string().describe("Years of experience.")
        .optional(),
    about_you: z.string().describe(
        "Free text about them the application may draw on.",
    ).optional(),
};

/** `applicant` on POST /v1/apply: a NEW person. name + email are what the
 *  route requires (400 otherwise). */
export const zWorklittleNewApplicant = z.looseObject({
    name: z.string().min(1).describe("Their full name."),
    email: z.string().min(3).describe(
        "Their real email address. Employer replies are forwarded there, " +
            "and Worklittle emails them their applicant_id.",
    ),
    ...zWorklittleApplicantFields,
});

export const zApplicantPathParams = z.object({
    id: z.string().min(1).describe(
        "The applicant_id from worklittle#apply/profile or worklittle#apply " +
            "(also emailed to the person).",
    ),
});

export const zApplySessionPathParams = z.object({
    id: z.string().min(1).describe(
        "The application id: a `session_id` from worklittle#apply.",
    ),
});
