import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/jobs` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/jobs). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinJobsBody = z.object({
    jobTitles: z.string()
        .describe("Job title to search for (e.g. 'product manager')."),
    maxResults: z.number().int()
        .describe("Jobs to return. Use 0 for all.")
        .optional(),
    locations: z.string()
        .describe("Filter to jobs in this location.")
        .optional(),
    company: z.array(z.string()).max(10)
        .describe(
            "Filter to jobs at these companies (e.g. Google, Stripe). One per line. Up to 10 per run.",
        )
        .optional(),
    workplaceType: z.array(z.enum(["remote", "hybrid", "office"]))
        .describe("Filter by where the work happens.")
        .optional(),
    employmentType: z.array(
        z.enum([
            "full-time",
            "part-time",
            "contract",
            "internship",
            "temporary",
        ]),
    )
        .describe("Filter by employment type.")
        .optional(),
    experienceLevel: z.array(
        z.enum([
            "internship",
            "entry",
            "associate",
            "mid-senior",
            "director",
            "executive",
        ]),
    )
        .describe("Filter by required experience level.")
        .optional(),
    salary: z.array(
        z.enum([
            "40k+",
            "60k+",
            "80k+",
            "100k+",
            "120k+",
            "140k+",
            "160k+",
            "180k+",
            "200k+",
        ]),
    )
        .describe("Only jobs paying at least this much (USD).")
        .optional(),
    postedLimit: z.enum(["1h", "24h", "week", "month"])
        .describe("Only jobs posted within this time window.")
        .optional(),
    sortBy: z.enum(["relevance", "date"])
        .describe("Sort order for results.")
        .optional(),
    industryIds: z.array(z.string()).max(20)
        .describe(
            "Filter by industry. Up to 20 per run. Accepts one of 434 values; list them with GET https://api.mindcase.co/v1/data/linkedin/jobs?expand=options.",
        )
        .optional(),
    easyApply: z.boolean()
        .describe("Only jobs you can apply to with one click on LinkedIn.")
        .optional(),
    under10Applicants: z.boolean()
        .describe("Only low-competition jobs (<10 applicants so far).")
        .optional(),
}).strict();
