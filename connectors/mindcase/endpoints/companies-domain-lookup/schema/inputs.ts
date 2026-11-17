import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `companies/domain-lookup` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/companies/domain-lookup). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCompaniesDomainLookupBody = z.object({
    companyNames: z.array(z.string())
        .describe(
            "Company name to resolve into its most likely domain name, such as Stripe or Y Combinator.",
        ),
    limit: z.number().int().min(0).max(10)
        .describe(
            "Most domain suggestions to return for each company name. Defaults to 5; use 0 for the maximum of 10.",
        )
        .optional(),
    perfectMatch: z.boolean()
        .describe(
            "Return only a single high-confidence suggestion instead of multiple candidates.",
        )
        .optional(),
}).strict();
