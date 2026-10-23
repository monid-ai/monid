import { z } from "zod";

/**
 * `POST /glassdoor/jobs` request body, the vendor mirror, optionality only
 * (D25): the vendor's own defaults are stated in each `describe`, none is
 * applied here.
 */
export const zGlassdoorJobsBody = z.object({
    keyword: z.string().min(1).describe(
        'Job search keyword or title, e.g. "software engineer". Required.',
    ),
    location: z.string().optional().describe(
        'City, state, or country to search in, e.g. "San Francisco, CA". ' +
            "Vendor default: no location filter.",
    ),
    maxJobs: z.number().int().min(1).max(250).optional().describe(
        "Maximum jobs to return (1-250, and not above your plan's limit). " +
            "Vendor default 20.",
    ),
    fromAge: z.enum(["1", "3", "7", "14", "30"]).optional().describe(
        "Only jobs posted within this many days, as a string: '1', '3', " +
            "'7', '14', or '30'. Vendor default: no recency filter.",
    ),
    jobType: z.array(
        z.enum(["fulltime", "parttime", "contract", "internship", "temporary"]),
    ).optional().describe(
        "Employment types to include. Vendor default: all types.",
    ),
    seniorityType: z.array(
        z.enum(["entrylevel", "midseniorlevel", "director", "executive"]),
    ).optional().describe(
        "Seniority levels to include. Vendor default: all levels.",
    ),
    remoteWorkType: z.array(z.enum(["1", "2", "3"])).optional().describe(
        "Work modes to include, as strings: '1' remote, '2' hybrid, '3' " +
            "on-site. Vendor default: all modes.",
    ),
    easyApply: z.boolean().optional().describe(
        "true returns only Easy Apply jobs. Vendor default: not filtered.",
    ),
    minSalary: z.number().int().positive().optional().describe(
        "Minimum salary, a positive integer. Vendor default: no minimum.",
    ),
    maxSalary: z.number().int().positive().optional().describe(
        "Maximum salary, a positive integer. When minSalary is also given " +
            "it must be greater than or equal to minSalary, else the " +
            "vendor returns 400. Vendor default: no maximum.",
    ),
    radius: z.enum(["5", "10", "15", "25", "50", "100"]).optional().describe(
        "Search radius around the location in miles, as a string: '5', " +
            "'10', '15', '25', '50', or '100'. Vendor default: Glassdoor's " +
            "own radius.",
    ),
    employerSizes: z.array(z.enum([
        "1to50",
        "51to200",
        "201to500",
        "501to1000",
        "1001to5000",
        "5001to10000",
        "10001+",
    ])).optional().describe(
        "Employer headcount bands to include. Vendor default: all sizes.",
    ),
    postedBy: z.array(z.enum(["jobPoster", "staffingAgency"])).optional()
        .describe(
            "Posting sources to include: the employer's own poster or a " +
                "staffing agency. Vendor default: both.",
        ),
    fields: z.array(z.enum([
        "*",
        "jobId",
        "url",
        "applyUrl",
        "profile",
        "location",
        "compensation",
        "employer",
        "meta",
    ])).optional().describe(
        "Fields to include per job. Omit for the defaults (jobId, url, " +
            'profile, location, compensation, employer, meta). Use ["*"] ' +
            "for every field. applyUrl (the employer's own job page) costs " +
            'one extra upstream request per 50 jobs, so only ["*"] or an ' +
            "explicit applyUrl returns it.",
    ),
}).strict();
