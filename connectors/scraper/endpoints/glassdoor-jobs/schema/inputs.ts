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
    location: z.string().describe(
        'City, state, or country to search in, e.g. "San Francisco, CA". ' +
            "Vendor default: no location filter.",
    ).optional(),
    maxJobs: z.number().int().min(1).max(250).describe(
        "Maximum jobs to return (1-250, and not above your plan's limit). " +
            "Vendor default 20.",
    ).optional(),
    fromAge: z.enum(["1", "3", "7", "14", "30"]).describe(
        "Only jobs posted within this many days, as a string: '1', '3', " +
            "'7', '14', or '30'. Vendor default: no recency filter.",
    ).optional(),
    jobType: z.array(
        z.enum(["fulltime", "parttime", "contract", "internship", "temporary"]),
    ).describe(
        "Employment types to include. Vendor default: all types.",
    ).optional(),
    seniorityType: z.array(
        z.enum(["entrylevel", "midseniorlevel", "director", "executive"]),
    ).describe(
        "Seniority levels to include. Vendor default: all levels.",
    ).optional(),
    remoteWorkType: z.array(z.enum(["1", "2", "3"])).describe(
        "Work modes to include, as strings: '1' remote, '2' hybrid, '3' " +
            "on-site. Vendor default: all modes.",
    ).optional(),
    easyApply: z.boolean().describe(
        "true returns only Easy Apply jobs. Vendor default: not filtered.",
    ).optional(),
    minSalary: z.number().int().positive().describe(
        "Minimum salary, a positive integer. Vendor default: no minimum.",
    ).optional(),
    maxSalary: z.number().int().positive().describe(
        "Maximum salary, a positive integer. When minSalary is also given " +
            "it must be greater than or equal to minSalary, else the " +
            "vendor returns 400. Vendor default: no maximum.",
    ).optional(),
    radius: z.enum(["5", "10", "15", "25", "50", "100"]).describe(
        "Search radius around the location in miles, as a string: '5', " +
            "'10', '15', '25', '50', or '100'. Vendor default: Glassdoor's " +
            "own radius.",
    ).optional(),
    employerSizes: z.array(z.enum([
        "1to50",
        "51to200",
        "201to500",
        "501to1000",
        "1001to5000",
        "5001to10000",
        "10001+",
    ])).describe(
        "Employer headcount bands to include. Vendor default: all sizes.",
    ).optional(),
    postedBy: z.array(z.enum(["jobPoster", "staffingAgency"])).describe(
        "Posting sources to include: the employer's own poster or a " +
            "staffing agency. Vendor default: both.",
    ).optional(),
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
    ])).describe(
        "Fields to include per job. Omit for the defaults (jobId, url, " +
            'profile, location, compensation, employer, meta). Use ["*"] ' +
            "for every field. applyUrl (the employer's own job page) costs " +
            'one extra upstream request per 50 jobs, so only ["*"] or an ' +
            "explicit applyUrl returns it.",
    ).optional(),
}).strict();
