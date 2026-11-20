import { z } from "zod";

/**
 * Shared fragments for the Fiber endpoint schemas — a faithful mirror of
 * the API's own zod (fiber-ai/backend `api/routes/*`, 2026-11): optionality
 * only, no `.default()` (design D25). Fiber's `nullish()` fields are
 * mirrored as `optional()` — a caller never needs to send `null`.
 */

/** Detailed-education toggle shared by the profile endpoints. */
export const zGetDetailedEducation = z.boolean().describe(
    "When true, returns detailed_education[] with school details for each " +
        "education entry. No extra cost. Fiber default false.",
);

/** Detailed-work-experience toggle shared by the profile endpoints. */
export const zGetDetailedWorkExperience = z.boolean().describe(
    "When true, returns detailed_work_experiences[] with company details " +
        "(domains, preferred name, LinkedIn slug, org id, employee count, " +
        "revenue estimate) for each job. No extra cost. Fiber default false.",
);

/** A `{value}` wrapper — Fiber's kitchen-sink text-field shape. */
export const zValue = (describe: string) =>
    z.object({
        value: z.string().min(1).describe(describe),
    });

/** A `{value, looseMatch}` wrapper for name / headline matching. */
export const zLooseValue = (describe: string, loose: string) =>
    z.object({
        value: z.string().min(1).describe(describe),
        looseMatch: z.boolean().optional().describe(loose),
    });

/** A LinkedIn company identifier, discriminated on `identifier`. */
export const zCompanyIdentifier = z.discriminatedUnion("identifier", [
    z.object({
        identifier: z.literal("linkedinSlug").describe(
            "Identifier kind: linkedinSlug.",
        ),
        value: z.string().min(1).describe(
            "The company's LinkedIn slug (e.g. 'microsoft').",
        ),
    }),
    z.object({
        identifier: z.literal("linkedinUrl").describe(
            "Identifier kind: linkedinUrl.",
        ),
        value: z.string().min(1).describe(
            "The company's LinkedIn URL (e.g. " +
                "'https://www.linkedin.com/company/microsoft').",
        ),
    }),
    z.object({
        identifier: z.literal("linkedinOrgID").describe(
            "Identifier kind: linkedinOrgID.",
        ),
        value: z.string().min(1).describe(
            "The company's LinkedIn organization ID (e.g. '1035').",
        ),
    }),
]);

/** A location hint: any of country code, state, or free text. */
export const zLocation = z.object({
    countryCode: z.string().length(3).optional().describe(
        "ISO 3166-1 alpha-3 country code (e.g. 'USA', 'GBR').",
    ),
    stateName: z.string().optional().describe(
        "State or region name in plain text (e.g. 'California').",
    ),
    locality: z.string().optional().describe(
        "Free-text location, for locations that do not split cleanly into " +
            "country / state / city.",
    ),
});
