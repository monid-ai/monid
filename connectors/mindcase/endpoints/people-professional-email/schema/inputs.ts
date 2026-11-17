import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `people/professional-email` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/people/professional-email). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPeopleProfessionalEmailBody = z.object({
    linkedinUrls: z.array(z.string())
        .describe(
            "LinkedIn profile URLs of the people to find professional emails for, one person per URL. Each URL is one lookup.",
        )
        .optional(),
    people: z.array(z.string())
        .describe(
            "One person per line: full name, a comma (or a tab, when pasted from a spreadsheet), then the company's website domain or its name. Example: Paul D'Ambra, posthog.com or Satya Nadella, Microsoft. A domain is used as given; a company name is turned into the domain the company sends email from, and the Company Domain column shows which one was used. Each entry is one lookup.",
        )
        .optional(),
}).strict();
