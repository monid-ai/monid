import { z } from "zod";

/**
 * Body of POST /v1/contact-details/lite (liteContactReveal). Faithful
 * mirror minus Fiber's optional `company` override (a nested
 * company-identifier union only used to route mismatched work emails into
 * `unmatchedWorkEmails`) — absent means Fiber matches against the
 * person's own current company.
 */
export const zLiteRevealBody = z.object({
    input: z.discriminatedUnion("mode", [
        z.object({
            mode: z.literal("linkedin").describe(
                "Lookup mode: linkedin.",
            ),
            linkedinIdentifier: z.string().min(1).describe(
                "LinkedIn profile identifier — a full URL, bare slug, or " +
                    "URN (e.g. 'williamhgates', " +
                    "'https://www.linkedin.com/in/williamhgates').",
            ),
            fullName: z.string().min(1).nullish().describe(
                "Full name of the person. Optional — improves match " +
                    "accuracy.",
            ),
        }),
        z.object({
            mode: z.literal("name-domain").describe(
                "Lookup mode: name-domain.",
            ),
            fullName: z.string().min(1).describe("Full name of the person."),
            companyDomain: z.string().min(1).describe(
                "Domain of the person's current company (e.g. " +
                    "'gatesfoundation.org').",
            ),
        }),
    ]).describe(
        "Who to look up: mode 'linkedin' (a LinkedIn identifier) or mode " +
            "'name-domain' (full name + company domain).",
    ),
    enrichmentType: z.object({
        getWorkEmails: z.boolean().describe(
            "Look for a work email. Fiber default true.",
        ).optional(),
        getPersonalEmails: z.boolean().describe(
            "Look for a personal email. Fiber default false.",
        ).optional(),
        getPhoneNumbers: z.boolean().describe(
            "Look for a phone number. Fiber default false.",
        ).optional(),
    }).optional(),
    patience: z.enum(["MINIMUM", "LOW", "MEDIUM", "HIGH", "EXTREME", "MAXIMUM"])
        .nullish().describe(
            "How long to wait for email deliverability validation after a " +
                "contact is found. Higher patience is slower but more " +
                "accurate. Fiber default MEDIUM.",
        ),
});
