import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `people/personal-email` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/people/personal-email). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zPeoplePersonalEmailBody = z.object({
    linkedinUrls: z.array(z.string())
        .describe(
            "LinkedIn profile URLs of the people to find personal emails for, one person per URL. Each URL is one lookup.",
        )
        .optional(),
    people: z.array(z.string())
        .describe(
            "One person per line: full name, a comma (or a tab, when pasted from a spreadsheet), then the company name or website domain. Example: Jason Fried, basecamp.com or Satya Nadella, Microsoft. The person's LinkedIn profile is found first, then their personal email. Each entry is one lookup.",
        )
        .optional(),
}).strict();
