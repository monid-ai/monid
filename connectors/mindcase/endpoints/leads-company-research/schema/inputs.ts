import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `leads/company-research` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/leads/company-research). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLeadsCompanyResearchBody = z.object({
    domains: z.array(z.string())
        .describe("One or more domains. One request reads them all."),
    maxPagesPerDomain: z.number().int().min(1).max(10)
        .describe(
            "How many pages to read on each domain, 1 to 10 (the home page first, then linked about and contact pages). Defaults to 3.",
        )
        .optional(),
    includeTechHints: z.boolean()
        .describe("Include Tech Hints.")
        .optional(),
}).strict();
