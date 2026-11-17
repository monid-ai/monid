import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `people/phone-lookup` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/people/phone-lookup). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPeoplePhoneLookupBody = z.object({
    linkedinUrls: z.array(z.string())
        .describe(
            "LinkedIn profile URLs of the people to find phone numbers for, one person per URL. Each URL is one lookup.",
        )
        .optional(),
    people: z.array(z.string())
        .describe(
            "One person per line: full name, a comma (or a tab, when pasted from a spreadsheet), then the company name or website domain. Example: Jason Fried, basecamp.com or Satya Nadella, Microsoft. The person's LinkedIn profile is found first, then their number. Each entry is one lookup.",
        )
        .optional(),
    emails: z.array(z.string())
        .describe(
            "Work or personal email addresses of the people to find phone numbers for, one person per email. Each email is one lookup.",
        )
        .optional(),
    fullName: z.string()
        .describe(
            "Legacy API input for one person, kept for existing integrations; use People instead. The person's full name, used together with Company Or Domain.",
        )
        .optional(),
    companyOrDomain: z.array(z.string())
        .describe(
            "Legacy API input that goes with Full Name; use People instead. The person's company name or website domain (the first entry is used).",
        )
        .optional(),
}).strict();
