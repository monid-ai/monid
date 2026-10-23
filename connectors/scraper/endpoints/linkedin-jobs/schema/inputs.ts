import { z } from "zod";
import { linkedinNumericIdPattern } from "../../../schema/linkedin.ts";

/**
 * `POST /linkedin/jobs` request body: the vendor mirror (D25): the vendor's
 * own defaults are stated in each `describe`, none is applied here. The
 * vendor takes exactly one of `keyword` or `companyId` (both or neither is
 * 400) and allows `location` only with `keyword`, so the body is a union of
 * two strict objects: each arm requires one selector and omits the other,
 * and only the keyword arm carries `location`. The vendor's unique-values
 * rule on the filter arrays cannot reach the JSON Schema and is stated in
 * the field text.
 */
const keyword = z.string().min(1).max(200).describe(
    'Search text, 1-200 characters, not blank, e.g. "platform engineer". ' +
        "Give exactly one of `keyword` or `companyId`.",
);
const location = z.string().min(1).max(200).describe(
    'Location text, 1-200 characters, not blank, e.g. "Stockholm". Valid ' +
        "only with `keyword`. Omit for no location filter.",
);
const companyId = z.string().regex(linkedinNumericIdPattern).describe(
    "Numeric LinkedIn company id (1-32 digits) to list that company's " +
        "jobs, e.g. the `companyId` of a job detail. Give exactly one of " +
        "`keyword` or `companyId`. Cannot be combined with `location`.",
);

const filters = {
    maxItems: z.number().int().min(1).max(100).describe(
        "Maximum jobs to return, 1-100 (also capped by your plan's limit). " +
            "Vendor default 25. The price is 1 credit whatever this is.",
    ).optional(),
    jobType: z.array(z.enum([
        "full_time",
        "part_time",
        "contract",
        "temporary",
        "volunteer",
        "internship",
        "other",
    ])).max(7).describe(
        "Employment types to keep, unique values only. Checked on each " +
            "job's detail page, so a narrow filter can return fewer jobs " +
            "than `maxItems` with a `filter_scan_limit` warning. Vendor " +
            "default: all types.",
    ).optional(),
    experienceLevel: z.array(z.enum([
        "internship",
        "entry_level",
        "associate",
        "mid_senior",
        "director",
        "executive",
    ])).max(6).describe(
        "Experience levels to keep, unique values only. Checked on each " +
            "job's detail page, like `jobType`. Vendor default: all levels.",
    ).optional(),
    workType: z.array(z.enum(["on_site", "remote", "hybrid"])).max(3)
        .describe(
            "Work arrangements to keep, unique values only. Vendor " +
                "default: all arrangements.",
        ).optional(),
    datePosted: z.enum(["past_24h", "past_week", "past_month"]).describe(
        "Only jobs posted within this window. Vendor default: any date.",
    ).optional(),
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
    ]).describe(
        "Minimum annual salary, as a string from the fixed list. Vendor " +
            "default: no salary filter.",
    ).optional(),
    sortBy: z.enum(["relevant", "recent"]).describe(
        'Sort order. Vendor default "relevant".',
    ).optional(),
    easyApplyOnly: z.boolean().describe(
        "Return only Easy Apply jobs. Vendor default false.",
    ).optional(),
};

export const zLinkedinJobsBody = z.union([
    z.object({
        keyword,
        location: location.optional(),
        ...filters,
    }).strict(),
    z.object({
        companyId,
        ...filters,
    }).strict(),
]).describe(
    "Search by `keyword` (with an optional `location`) or list one " +
        "company's jobs by `companyId`: exactly one of the two.",
);
