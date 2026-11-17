import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `companies/enrichment` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/companies/enrichment). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCompaniesEnrichmentBody = z.object({
    domains: z.array(z.string())
        .describe(
            "Company website domains to look up, without scheme or www, one call per domain.",
        )
        .optional(),
    names: z.array(z.string())
        .describe(
            "Company names to look up when a domain is not available; less accurate for common names.",
        )
        .optional(),
    linkedinUrls: z.array(z.string())
        .describe("Company LinkedIn profile URLs to look up.")
        .optional(),
}).strict();
