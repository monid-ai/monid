import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `naukri/job` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/naukri/job). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zNaukriJobBody = z.object({
    inputs: z.string()
        .describe(
            "A search keyword (e.g. 'software developer') or a Naukri search URL to scrape job listings from.",
        ),
    maxResults: z.number().int().min(50)
        .describe("Number of jobs to return (minimum 50). Use 0 for all.")
        .optional(),
    freshness: z.enum(["all", "30", "15", "7", "3", "1"])
        .describe("Filter to recently-posted jobs.")
        .optional(),
    sortBy: z.enum(["relevance", "date"])
        .describe("Sort order for results.")
        .optional(),
    experience: z.enum([
        "all",
        "0",
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
        "27",
        "28",
        "29",
        "30",
    ])
        .describe("Required years of experience.")
        .optional(),
    workMode: z.array(z.enum(["office", "temporary_wfh", "remote", "hybrid"]))
        .describe("Filter by work arrangement.")
        .optional(),
    department: z.array(
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
            "27",
            "28",
            "29",
            "30",
            "31",
            "32",
            "33",
            "34",
            "35",
            "36",
            "37",
        ]),
    )
        .describe("Filter by department.")
        .optional(),
    salaryRange: z.array(
        z.enum([
            "0to3",
            "3to6",
            "6to10",
            "10to15",
            "15to25",
            "25to50",
            "50to75",
            "75to100",
            "100to500",
            "501",
        ]),
    )
        .describe("Filter by salary band (Indian Lakhs per Annum).")
        .optional(),
    companyType: z.array(z.enum(["213", "211", "217", "62", "63", "215", "60"]))
        .describe("Filter by company type.")
        .optional(),
    roleCategory: z.array(z.string())
        .describe(
            "Filter by job role. Accepts one of 164 values; list them with GET https://api.mindcase.co/v1/data/naukri/job?expand=options.",
        )
        .optional(),
    industry: z.array(z.string())
        .describe(
            "Filter by industry. Accepts one of 83 values; list them with GET https://api.mindcase.co/v1/data/naukri/job?expand=options.",
        )
        .optional(),
    topCompanies: z.array(z.string())
        .describe(
            "Filter to specific top companies. Accepts one of 1083 values; list them with GET https://api.mindcase.co/v1/data/naukri/job?expand=options.",
        )
        .optional(),
    postedBy: z.array(z.enum(["1", "2"]))
        .describe("Filter by who posted the listing.")
        .optional(),
    stipend: z.array(
        z.enum([
            "unpaid",
            "0To10",
            "10To20",
            "20To30",
            "30To40",
            "40To50",
            "50To1",
        ]),
    )
        .describe("Internship stipend range.")
        .optional(),
    duration: z.array(z.enum(["1", "2", "3", "4", "5", "6", "-1"]))
        .describe("Internship duration.")
        .optional(),
    ugCourse: z.array(
        z.enum([
            "18",
            "11",
            "14",
            "10",
            "17",
            "5",
            "3",
            "4",
            "1",
            "13",
            "6",
            "9",
            "12",
            "2",
            "8",
            "16",
            "7",
            "36",
            "40",
            "35",
            "41",
            "42",
            "15",
            "37",
            "38",
        ]),
    )
        .describe("Required undergraduate course.")
        .optional(),
    pgCourse: z.array(
        z.enum([
            "19",
            "20",
            "13",
            "12",
            "14",
            "1",
            "11",
            "8",
            "15",
            "16",
            "10",
            "6",
            "5",
            "3",
            "9",
            "2",
            "18",
            "37",
            "7",
            "4",
            "38",
            "36",
            "34",
            "17",
            "35",
        ]),
    )
        .describe("Required postgraduate course.")
        .optional(),
    cities: z.array(z.string())
        .describe("Filter results to specific cities.")
        .optional(),
    fetchDetails: z.boolean()
        .describe(
            "Pull full job description, requirements, etc. for each result. Slower but richer data.",
        )
        .optional(),
}).strict();
