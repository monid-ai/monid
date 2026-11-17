import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/companies` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/companies). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinCompaniesBody = z.object({
    companies: z.array(z.string())
        .describe("LinkedIn company URLs to fetch. One per line.")
        .optional(),
    query: z.string()
        .describe(
            "Keywords to find LinkedIn companies (e.g. 'fintech startup').",
        )
        .optional(),
    locations: z.array(z.string())
        .describe(
            "Filter to companies in these locations (e.g. 'San Francisco'). One per line.",
        )
        .optional(),
    companySize: z.array(
        z.enum([
            "1-10",
            "11-50",
            "51-200",
            "201-500",
            "501-1000",
            "1001-5000",
            "5001-10000",
            "10001+",
        ]),
    )
        .describe("Filter to companies in this employee-count band.")
        .optional(),
    industries: z.array(z.string())
        .describe(
            "Filter to companies in this industry. Accepts one of 434 values; list them with GET https://api.mindcase.co/v1/data/linkedin/companies?expand=options.",
        )
        .optional(),
    maxResults: z.number().int().max(1000)
        .describe(
            "Max companies to return (up to 1,000). Ignored when company URLs are passed.",
        )
        .optional(),
}).strict();
