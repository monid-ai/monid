import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `people/enrichment` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/people/enrichment). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPeopleEnrichmentBody = z.object({
    linkedinUrls: z.array(z.string())
        .describe(
            "LinkedIn profile URLs of the people to enrich, one person per URL. Each URL is one lookup.",
        )
        .optional(),
    emails: z.array(z.string())
        .describe(
            "Work email addresses of the people to enrich, one person per email. Best effort: shared or vanity aliases may match the wrong person.",
        )
        .optional(),
    people: z.array(z.string())
        .describe(
            "One person per entry, written as full name, then a comma, then the company name or website domain. Example: Jason Fried, basecamp.com or Satya Nadella, Microsoft. Each entry is one lookup.",
        )
        .optional(),
    firstName: z.string()
        .describe(
            "Legacy API input for one person, kept for existing integrations; use People instead. The person's first name; must be used together with last name and company name.",
        )
        .optional(),
    lastName: z.string()
        .describe(
            "Legacy API input for one person, kept for existing integrations; use People instead. The person's last name; must be used together with first name and company name.",
        )
        .optional(),
    companyName: z.string()
        .describe(
            "Legacy API input for one person, kept for existing integrations; use People instead. The person's current or recent employer, used together with first and last name.",
        )
        .optional(),
    companyDomain: z.string()
        .describe(
            "Legacy API input for one person, kept for existing integrations; use People instead. The employer's website domain, improving match accuracy when searching by name and company.",
        )
        .optional(),
}).strict();
