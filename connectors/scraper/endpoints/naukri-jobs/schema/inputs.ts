import { z } from "zod";

/** The vendor trims every string and drops duplicate values in each array
 *  before it validates; the mirror keeps the shapes and states both in the
 *  `describe` texts. */
const zSourceId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u);

const zSourceIdList = (what: string) =>
    z.array(zSourceId).min(1).max(50).optional().describe(
        `${what} Naukri IDs (1-50 values, each 1-100 letters, digits, ` +
            `underscores, or hyphens; duplicates are removed). Combine ` +
            `with other filters to narrow the search.`,
    );

const zFilters = z.object({
    sort: z.enum(["relevance", "date"]).optional().describe(
        'Result order: "relevance" or "date" (newest first). Vendor ' +
            'default "relevance". Sorting alone is not a search selector.',
    ),
    freshness: z.enum(["", "1", "3", "7", "15", "30"]).optional().describe(
        'Only jobs posted within this many days: "1", "3", "7", "15", or ' +
            '"30". Vendor default "" (any age). A non-empty value counts ' +
            "as a search selector.",
    ),
    experience: z.number().int().min(0).max(30).optional().describe(
        "Years of experience (0-30); Naukri returns jobs whose experience " +
            "range includes it. 0 counts as a search selector.",
    ),
    workModes: z.array(z.enum(["office", "remote", "hybrid"])).min(1).max(3)
        .optional().describe(
            'Work arrangements to include: "office", "remote", "hybrid" ' +
                "(1-3 values; duplicates are removed).",
        ),
    salaryRanges: z.array(z.enum([
        "0-3-lakhs",
        "3-6-lakhs",
        "6-10-lakhs",
        "10-15-lakhs",
        "15-25-lakhs",
        "25-50-lakhs",
        "50-75-lakhs",
        "75-100-lakhs",
        "1-5-crore",
    ])).min(1).max(9).optional().describe(
        "Annual salary bands in Indian rupees to include (1-9 values; " +
            "duplicates are removed). A lakh is 100,000 rupees and a crore " +
            "is 10,000,000.",
    ),
    postedBy: z.array(z.enum(["company", "consultant"])).min(1).max(2)
        .optional().describe(
            'Poster types to include: "company" (direct employer) or ' +
                '"consultant" (recruiting agency). 1-2 values; duplicates ' +
                "are removed.",
        ),
    locationRadiusKm: z.number().int().min(1).max(500).optional().describe(
        "Widen the search to this many kilometers around the location " +
            "(1-500). Requires `location` or `advancedFilters.cityIds`, " +
            "otherwise the call fails with 400. Not a search selector.",
    ),
}).strict().describe(
    "Job filters: sort, freshness, experience, workModes, salaryRanges, " +
        "postedBy, and locationRadiusKm.",
);

const zInternshipFilters = z.object({
    internships: z.boolean().optional().describe(
        "Search internships only. Vendor default false. True counts as a " +
            "search selector.",
    ),
    internshipStipends: z.array(z.enum([
        "unpaid",
        "0-10k",
        "10-20k",
        "20-30k",
        "40-50k",
        "50k-plus",
    ])).min(1).max(6).optional().describe(
        "Monthly stipend bands in Indian rupees to include (1-6 values; " +
            'duplicates are removed). "10k" is 10,000 rupees. Selecting ' +
            "a band turns the search into an internship search.",
    ),
    internshipDurations: z.array(z.enum([
        "2-months",
        "3-months",
        "4-months",
        "6-months",
        "flexible",
    ])).min(1).max(5).optional().describe(
        "Internship durations to include (1-5 values; duplicates are " +
            "removed). Selecting a duration turns the search into an " +
            "internship search.",
    ),
    campusJobs: z.boolean().optional().describe(
        "Search Naukri Campus (campus hiring) jobs only. Vendor default " +
            "false. True counts as a search selector.",
    ),
}).strict().describe(
    "Internship filters: internships, internshipStipends, " +
        "internshipDurations, and campusJobs.",
);

const zAdvancedFilters = z.object({
    companyId: z.string().regex(/^[1-9]\d*$/u).optional().describe(
        "A Naukri company ID as a digit string with no leading zero, e.g. " +
            '"7053". Takes precedence over `companyName`.',
    ),
    companyGroupIds: zSourceIdList("Company group"),
    cityIds: zSourceIdList("City"),
    localityIds: zSourceIdList("Locality"),
    originCityIds: zSourceIdList("Origin city"),
    departmentIds: zSourceIdList("Department"),
    industryIds: zSourceIdList("Industry"),
    roleIds: zSourceIdList("Role"),
    jobTypeIds: zSourceIdList("Job type"),
    employmentTypeIds: zSourceIdList("Employment type"),
    undergraduateCourseIds: zSourceIdList("Undergraduate course"),
    postgraduateCourseIds: zSourceIdList("Postgraduate course"),
    companyName: z.string().min(1).max(200).optional().describe(
        "Employer name (1-200 characters). The service resolves it to a " +
            "Naukri company first and returns no jobs when no company " +
            "matches. Ignored when `companyId` or `companyGroupIds` is " +
            "set.",
    ),
    undergraduateSpecialization: z.string().min(1).max(200).optional()
        .describe("Undergraduate specialization text (1-200 characters)."),
    postgraduateSpecialization: z.string().min(1).max(200).optional()
        .describe("Postgraduate specialization text (1-200 characters)."),
    localityRadiusKm: z.number().int().min(1).max(500).optional().describe(
        "Widen the search to this many kilometers around the selected " +
            "localities (1-500). Requires `localityIds`, otherwise the " +
            "call fails with 400. Not a search selector.",
    ),
}).strict().describe(
    "Naukri's own selectors: company, company group, city, locality, " +
        "origin city, department, industry, role, job type, employment " +
        "type, and course IDs, plus companyName, education " +
        "specializations, and localityRadiusKm. Every field is optional.",
);

/**
 * `POST /naukri/jobs` request body: the vendor mirror, optionality only
 * (D25): the vendor's own defaults are stated in each `describe`, none is
 * applied here. Three cross-field rules sit in the vendor's refinement and
 * cannot reach the JSON Schema, so they are stated in the `describe` text:
 * at least one search selector, `filters.locationRadiusKm` needs a
 * location, and `maxItems` at most 10 with `fetchDetails`.
 */
export const zNaukriJobsBody = z.object({
    keyword: z.string().max(200).optional().describe(
        'Job title, skill, or keyword (max 200 characters), e.g. "data ' +
            'analyst". Vendor default "". The call needs at least one ' +
            "search selector (see the body description).",
    ),
    location: z.string().max(200).optional().describe(
        "Free-text India location (max 200 characters), e.g. " +
            '"Bengaluru". Vendor default "".',
    ),
    maxItems: z.number().int().min(1).max(100).optional().describe(
        "Maximum jobs to return (1-100, also capped by your plan). Vendor " +
            "default 20. MUST be 10 or less when `fetchDetails` is true, " +
            "and the default of 20 is rejected then, so set it " +
            "explicitly.",
    ),
    fetchDetails: z.boolean().optional().describe(
        "Fetch the full record (description, skills, company profile) for " +
            "each result, for 1 extra credit per call. Vendor default " +
            "false. Needs `maxItems` of 10 or less.",
    ),
    filters: zFilters.optional(),
    internshipFilters: zInternshipFilters.optional(),
    advancedFilters: zAdvancedFilters.optional(),
}).strict().describe(
    "Search public Naukri jobs. The call needs at least one search " +
        "selector, otherwise it fails with 400 and no credits. Selectors " +
        "are: a non-empty `keyword` or `location`; `filters.experience`, " +
        "a non-empty `filters.freshness`, or a non-empty `filters." +
        "workModes`, `salaryRanges`, or `postedBy`; `internshipFilters." +
        "internships` or `campusJobs` true, or a non-empty " +
        "`internshipStipends` or `internshipDurations`; and in " +
        "`advancedFilters` any ID list, `companyId`, `companyName`, or a " +
        "specialization. Sorting, radii, `maxItems`, and `fetchDetails` " +
        "are not selectors.",
);
