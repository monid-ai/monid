import { z } from "zod";
import { linkedinNumericIdPattern } from "../../../schema/linkedin.ts";

/**
 * `POST /linkedin/jobs` request body: the vendor mirror, optionality only
 * (D25): the vendor's own defaults are stated in each `describe`, none is
 * applied here. The vendor's cross-field rules (exactly one of `keyword` or
 * `companyId`; `location` only with `keyword`; unique filter values) live in
 * the `describe` text, and the vendor answers 400 with no credits when one
 * is broken.
 */
export const zLinkedinJobsBody = z.object({
    keyword: z.string().min(1).max(200).optional().describe(
        'Search text, 1-200 characters, not blank, e.g. "platform ' +
            'engineer". Give exactly one of `keyword` or `companyId`: both ' +
            "or neither returns 400.",
    ),
    location: z.string().min(1).max(200).optional().describe(
        'Location text, 1-200 characters, not blank, e.g. "Stockholm". ' +
            "Valid only with `keyword`; with `companyId` it returns 400. " +
            "Omit for no location filter.",
    ),
    companyId: z.string().regex(linkedinNumericIdPattern).optional()
        .describe(
            "Numeric LinkedIn company id (1-32 digits) to list that " +
                "company's jobs, e.g. the `companyId` of a job detail. " +
                "Give exactly one of `keyword` or `companyId`: both or " +
                "neither returns 400. Cannot be combined with `location`.",
        ),
    maxItems: z.number().int().min(1).max(100).optional().describe(
        "Maximum jobs to return, 1-100 (also capped by your plan's limit). " +
            "Vendor default 25. The price is 1 credit whatever this is.",
    ),
    jobType: z.array(z.enum([
        "full_time",
        "part_time",
        "contract",
        "temporary",
        "volunteer",
        "internship",
        "other",
    ])).max(7).optional().describe(
        "Employment types to keep, unique values only. Checked on each " +
            "job's detail page, so a narrow filter can return fewer jobs " +
            "than `maxItems` with a `filter_scan_limit` warning. Vendor " +
            "default: all types.",
    ),
    experienceLevel: z.array(z.enum([
        "internship",
        "entry_level",
        "associate",
        "mid_senior",
        "director",
        "executive",
    ])).max(6).optional().describe(
        "Experience levels to keep, unique values only. Checked on each " +
            "job's detail page, like `jobType`. Vendor default: all levels.",
    ),
    workType: z.array(z.enum(["on_site", "remote", "hybrid"])).max(3)
        .optional().describe(
            "Work arrangements to keep, unique values only. Vendor " +
                "default: all arrangements.",
        ),
    datePosted: z.enum(["past_24h", "past_week", "past_month"]).optional()
        .describe(
            "Only jobs posted within this window. Vendor default: any date.",
        ),
    salary: z.enum([
        "40000",
        "60000",
        "80000",
        "100000",
        "120000",
        "140000",
        "160000",
        "180000",
        "200000",
    ]).optional().describe(
        "Minimum annual salary, as a string from the fixed list. Vendor " +
            "default: no salary filter.",
    ),
    sortBy: z.enum(["relevant", "recent"]).optional().describe(
        'Sort order. Vendor default "relevant".',
    ),
    easyApplyOnly: z.boolean().optional().describe(
        "Return only Easy Apply jobs. Vendor default false.",
    ),
}).strict();
