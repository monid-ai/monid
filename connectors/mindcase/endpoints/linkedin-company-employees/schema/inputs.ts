import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/company-employees` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/company-employees). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinCompanyEmployeesBody = z.object({
    companies: z.array(z.string())
        .describe("LinkedIn company URLs. One per line."),
    maxResults: z.number().int()
        .describe("Number of employee profiles to return. Use 0 for all.")
        .optional(),
    locations: z.array(z.string())
        .describe(
            "Filter by location (e.g. San Francisco, London). One per line.",
        )
        .optional(),
    jobTitles: z.array(z.string())
        .describe(
            "Filter by current job title (e.g. Software Engineer, Product Manager). One per line.",
        )
        .optional(),
    yearsAtCompany: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe("Filter to employees in this tenure band.")
        .optional(),
    yearsOfExperience: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe("Filter to employees in this experience band.")
        .optional(),
    companyHeadcount: z.array(
        z.enum([
            "1",
            "2-10",
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
    recentlyChangedJobs: z.boolean()
        .describe(
            "Set to true to only get people who have recently changed jobs.",
        )
        .optional(),
    pastJobTitles: z.array(z.string())
        .describe(
            "Filter by past job title text (e.g. 'engineer'). One per line.",
        )
        .optional(),
    seniorityLevels: z.array(
        z.enum([
            "100",
            "110",
            "120",
            "130",
            "200",
            "210",
            "220",
            "300",
            "310",
            "320",
        ]),
    )
        .describe("Filter to employees at this seniority level.")
        .optional(),
    functions: z.array(
        z.enum([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
        ]),
    )
        .describe("Filter to employees in this job function.")
        .optional(),
    industries: z.array(z.string())
        .describe(
            "Filter to employees in this industry. Accepts one of 434 values; list them with GET https://api.mindcase.co/v1/data/linkedin/company-employees?expand=options.",
        )
        .optional(),
}).strict();
