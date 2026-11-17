import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `companies/emails` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/companies/emails). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCompaniesEmailsBody = z.object({
    domains: z.array(z.string())
        .describe("Company website domains to find work email addresses for."),
    maxResults: z.number().int().min(0).max(100)
        .describe(
            "Most people emails to return from each domain. Defaults to 10; use 0 for the maximum of 100.",
        )
        .optional(),
    emailType: z.enum(["personal", "generic", "both"])
        .describe(
            "Whether to return named people emails, generic role emails (info@, sales@), or both.",
        )
        .optional(),
    departments: z.array(z.string())
        .describe("Restrict results to people in these departments.")
        .optional(),
    seniorities: z.array(z.string())
        .describe("Restrict results to people at these seniority levels.")
        .optional(),
}).strict();
