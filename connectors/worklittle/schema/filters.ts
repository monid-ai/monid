import { z } from "zod";

/**
 * Job filters shared by `GET /jobs` and `GET /jobs/salary-average`. Both
 * routes read them through one parser (jobs-api
 * `shared/utils/jobsListFilterParams.ts` + `routes/jobs.ts`, 2026-10-29).
 * Mirror carries optionality and the vendor's own single-field bounds
 * (non-empty strings, non-negative amounts); our tightening lives at each
 * binding.
 *
 * Exact-match filters are `z.enum`: Worklittle compares them verbatim, so a
 * misspelled value is not an error upstream, it silently matches nothing.
 */
export const zWorklittleJobFilters = z.object({
    q: z.string().describe(
        "Role search. Matches job titles (and an exact employer slug). " +
            "Comma-separate several roles to match any of them; prefix a " +
            "word with '-' to exclude titles containing it, e.g. " +
            "'product manager, -senior'. Prefer `title` for a plain role.",
    ).min(1).optional(),
    title: z.string().describe(
        "Job-title text only, never company names. Same comma and '-' " +
            "syntax as `q`, e.g. 'software engineer, data engineer, -intern'.",
    ).min(1).optional(),
    location: z.string().describe(
        "Partial match on the job's location text, e.g. 'Austin' or " +
            "'Berlin'. 'remote' means remote-only jobs. For a metro area " +
            "prefer near_lat/near_lng/radius_km on search.",
    ).optional(),
    location_region: z.string().describe(
        "Second location term ANDed with `location`, e.g. 'CA' to keep San " +
            "Francisco, CA and drop other San Franciscos.",
    ).optional(),
    location_or: z.string().describe(
        "Comma-separated places; a job matches if its location contains " +
            "ANY of them, e.g. 'San Francisco,New York,Seattle'.",
    ).optional(),
    country: z.string().describe(
        "ISO 3166-1 alpha-2 country code, e.g. US, GB, DE. Returns jobs in " +
            "that country plus remote jobs.",
    ).optional(),
    workplace_type: z.enum(["remote", "hybrid", "on_site"]).describe(
        "Workplace arrangement.",
    ).optional(),
    employment_type: z.enum([
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
    ]).describe("Employment contract type.").optional(),
    seniority_level: z.enum([
        "new_grad",
        "entry",
        "mid",
        "senior",
        "staff",
        "manager",
        "director",
        "executive",
    ]).describe(
        "Seniority band. Set only when the user asked for one; each " +
            "filter shrinks results a lot.",
    ).optional(),
    description_language: z.string().describe(
        "ISO 639-1 language of the posting text, e.g. en, es, de, fr.",
    ).optional(),
    visa_sponsorship: z.enum(["yes", "no"]).describe(
        "'yes': jobs whose posting offers visa sponsorship, or whose " +
            "employer filed H-1Bs for this kind of role in the last 12 " +
            "months. 'no': postings that say they do not sponsor.",
    ).optional(),
    salary_min: z.number().describe(
        "Only jobs whose listed minimum salary is at least this much " +
            "(annual, in the job's own currency). Jobs with no listed pay " +
            "are dropped. There is no maximum-salary filter.",
    ).min(0).optional(),
    company: z.string().describe(
        "Employer slug(s), lowercase and hyphenated, e.g. 'stripe'. " +
            "Comma-separate to include any of several ('meta,google'); " +
            "prefix with '-' to exclude ('-tesla'). Mixing is allowed.",
    ).optional(),
    posted_within_days: z.number().int().describe(
        "Only jobs posted in the last N days, e.g. 1 (today), 7 (this " +
            "week), 30. 0 or omitted means no cutoff.",
    ).min(0).optional(),
    since: z.number().int().describe(
        "Unix timestamp in seconds: only jobs posted at or after it. Wins " +
            "over posted_within_days when both are set.",
    ).optional(),
    exclude_ids: z.string().describe(
        "Comma-separated job ids to leave out, e.g. jobs already shown.",
    ).optional(),
});
