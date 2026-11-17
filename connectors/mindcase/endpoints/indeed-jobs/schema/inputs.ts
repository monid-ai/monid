import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `indeed/jobs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/indeed/jobs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zIndeedJobsBody = z.object({
    keyword: z.string()
        .describe('Job title or search keywords (e.g. "warehouse associate").')
        .optional(),
    location: z.string()
        .describe('City, state, or region (e.g. "Houston, TX").')
        .optional(),
    country: z.string()
        .describe(
            "Indeed country domain to search. (United Kingdom may be unreliable upstream.). Accepts one of 54 values; list them with GET https://api.mindcase.co/v1/data/indeed/jobs?expand=options.",
        )
        .optional(),
    remote: z.enum(["remote", "hybrid"])
        .describe("Only return remote or hybrid roles.")
        .optional(),
    jobType: z.enum([
        "fulltime",
        "parttime",
        "contract",
        "temporary",
        "internship",
    ])
        .describe("Filter by employment type.")
        .optional(),
    fromDays: z.number().int()
        .describe(
            "Only return jobs posted within this many days. One of 1, 3, 7 or 14; Indeed offers no other windows. Allowed values: 1 (Last 24 hours), 3 (Last 3 days), 7 (Last 7 days), 14 (Last 14 days).",
        )
        .optional(),
    sort: z.enum(["relevance", "date"])
        .describe(
            'Result ordering: "relevance" (default) or "date" (most recent first).',
        )
        .optional(),
    jobKeys: z.array(z.string())
        .describe("Specific Indeed job IDs to look up directly.")
        .optional(),
    maxItems: z.number().int()
        .describe("Number of job listings to return. Use 0 for all.")
        .optional(),
}).strict();
