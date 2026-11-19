import { z } from "zod";

/**
 * Shared fragments for the Hirebase endpoint schemas — a faithful mirror of
 * the public reference (https://www.hirebase.org/docs). Optionality only:
 * the platform's own tightening (`limit` required at every per-result
 * binding) lives in each endpoint.ts (design D25).
 *
 * Hirebase rejects unknown top-level body fields with 422, so every body is
 * a strict object: a misspelled filter fails here, before the wire, instead
 * of costing a call.
 */

/** Hirebase's own cap on `limit` for every search endpoint. */
export const LIMIT_MAX = 100;

export const zLocationType = z.enum(["Remote", "Hybrid", "In-Person"]);

export const zExperience = z.enum([
    "Entry",
    "Junior",
    "Mid",
    "Senior",
    "Executive",
]);

export const zJobType = z.enum([
    "Full Time",
    "Part Time",
    "Contract",
    "Internship",
]);

/** Company headcount buckets (the API names the filter `company_types`). */
export const zCompanySize = z.enum([
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1001-5000",
    "5001-10000",
    "10000+",
]);

export const zFundingType = z.enum([
    "Pre seed",
    "Seed",
    "Angel",
    "Convertible note",
    "Equity crowdfunding",
    "Series unknown",
    "Series A",
    "Series B",
    "Series C",
    "Series D",
    "Series E",
    "Series F",
    "Series G",
    "Series H",
    "Corporate round",
    "Private equity",
    "Debt financing",
    "Secondary market",
    "Grant",
    "Non equity assistance",
    "Undisclosed",
    "Post IPO equity",
    "Post IPO debt",
    "Post IPO secondary",
]);

/** One structured location. Any subset of the three fields may be sent. */
export const zGeoLocation = z.strictObject({
    city: z.string().describe(
        "City name. A free-text place also works here on its own, e.g. " +
            '"Austin, TX". "Remote" is not a place: use ' +
            "location_types for remote jobs.",
    ).optional(),
    region: z.string().describe(
        'State, region or province, spelled out ("California", not "CA").',
    ).optional(),
    country: z.string().describe(
        'Country name, spelled out ("United States").',
    ).optional(),
});

export const zGeoLocations = z.array(zGeoLocation).min(1);

/** A `{min, max}` numeric range; either bound may be omitted. Every range
 *  Hirebase takes is a money or count bound, so neither side goes below 0. */
export const zRange = z.strictObject({
    min: z.number().min(0).describe("Lower bound, inclusive.").optional(),
    max: z.number().min(0).describe("Upper bound, inclusive.").optional(),
});

export const zStrings = z.array(z.string().min(1)).min(1);

/** A filter Hirebase documents as "a single string or an array of strings". */
export const zStringOrStrings = z.union([z.string().min(1), zStrings]);

/** A yes/no flag. Hirebase accepts the JSON booleans and the strings
 *  "true"/"false" alike (verified live 2026-11-19: both forms filter
 *  identically), so the mirror takes both and coerces neither. */
export const zFlag = z.union([z.boolean(), z.enum(["true", "false"])]);

/** A calendar date, YYYY-MM-DD. */
export const zDate = z.iso.date();

export const zSortOrder = z.enum(["asc", "desc"]);

/**
 * The job filters shared by Search Jobs and Market Insights (Insights
 * accepts "the same filter shape as Search Jobs"). Paging and sorting are
 * NOT here — Insights takes neither.
 */
export const jobFilterShape = {
    job_titles: zStrings.describe(
        "Job titles, OR'd together. An unquoted multi-word entry matches " +
            "titles containing all of its words in any order; wrap an entry " +
            "in escaped double quotes for an exact phrase; prefix an entry " +
            'with - to exclude titles containing it (e.g. ["engineer", ' +
            '"-senior"]).',
    ).optional(),
    keywords: zStrings.describe(
        "Keywords matched against the description, technologies, skills " +
            "and benefits, OR'd together. A relevance signal, not a hard " +
            "filter: exact-phrase matches rank first and rare phrases still " +
            "return partial matches. Prefix an entry with - to exclude; a " +
            "multi-word exclusion excludes jobs containing ANY of its words.",
    ).optional(),
    company_keywords: zStrings.describe(
        "Keywords matched against the hiring company's description, " +
            "products and services.",
    ).optional(),
    location_types: z.array(zLocationType).min(1).describe(
        "Work arrangements to include.",
    ).optional(),
    geo_locations: zGeoLocations.describe(
        "Locations to search, OR'd together. A job with several locations " +
            "matches if any of them fits.",
    ).optional(),
    geofilter_params: z.strictObject({
        mode: z.enum(["auto", "weak", "strict", "box"]).describe(
            "auto (default) matches the surrounding metro area; strict " +
                "matches the exact location; weak matches by coordinates; " +
                "box matches a bounding box.",
        ).optional(),
        radius: z.number().positive().describe(
            "Search radius (default 25).",
        ).optional(),
        unit: z.enum(["mi", "km", "degrees"]).describe(
            "Unit of radius (default mi).",
        ).optional(),
    }).describe("How geo_locations are matched.").optional(),
    experience: z.array(zExperience).min(1).describe(
        "Experience levels to include.",
    ).optional(),
    yoe: zRange.describe("Years of experience required.").optional(),
    job_types: z.array(zJobType).min(1).describe(
        'Employment types to include. "Contract" matches jobs returned ' +
            'as "Contract / Temporary".',
    ).optional(),
    job_category: zStrings.describe(
        'Job category tags, e.g. "Engineering Jobs", "Marketing Jobs".',
    ).optional(),
    company_types: z.array(zCompanySize).min(1).describe(
        "Hiring-company headcount buckets (named company_types for " +
            "historical reasons; it filters by size).",
    ).optional(),
    funding_types: z.array(zFundingType).min(1).describe(
        "Only jobs at companies whose latest funding round is one of these " +
            "stages. Companies with no funding on file never match.",
    ).optional(),
    total_funding: zRange.describe(
        "Only jobs at companies that have raised this much in total, in " +
            "US dollars.",
    ).optional(),
    funded_after: zDate.describe(
        "Only jobs at companies whose latest funding round was on or " +
            "after this date (YYYY-MM-DD).",
    ).optional(),
    job_board: zStrings.describe(
        'Only jobs from these sources, e.g. ["greenhouse", "lever"].',
    ).optional(),
    exclude_job_board: zStrings.describe(
        'Leave out jobs from these sources, e.g. ["linkedin"] to keep ' +
            "only jobs read from company careers pages.",
    ).optional(),
    company_name: z.string().min(1).describe(
        "Company name, case-insensitive; a name the company is also known " +
            'by works too ("Ford Motor Company" finds Ford), but it is ' +
            'not a substring match: "Ramp" does not find LiveRamp. ' +
            "Prefer company_domain or company_slug when known.",
    ).optional(),
    company_domain: zStringOrStrings.describe(
        'Company websites, e.g. ["ford.com"]; a full URL works too. ' +
            "Returns jobs from any of them.",
    ).optional(),
    company_slug: zStringOrStrings.describe(
        "Hirebase company slugs (from Search Companies), e.g. " +
            '["stripe", "airbnb"]. Returns jobs from any of them.',
    ).optional(),
    salary: zRange.describe(
        "Posted salary range, in `currency` (default USD).",
    ).optional(),
    currency: z.string().length(3).describe(
        "Three-letter currency code for the salary filter, e.g. USD, EUR.",
    ).optional(),
    industry: zStringOrStrings.describe(
        'Industries of the hiring company, e.g. "Tech, Software & IT ' +
            'Services", "Healthcare".',
    ).optional(),
    sub_industry: zStringOrStrings.describe(
        'Sub-industries of the hiring company, e.g. "Fintech".',
    ).optional(),
    days_ago: z.number().int().min(0).describe(
        "Only jobs posted within this many days.",
    ).optional(),
    date_posted: zDate.describe(
        "Only jobs posted on or after this date (YYYY-MM-DD).",
    ).optional(),
    ingested_after: z.string().describe(
        "ISO-8601 datetime. Only jobs Hirebase first saved at or after " +
            "this time, whatever their posting date. The right filter for " +
            "polling for new jobs.",
    ).optional(),
    ingested_before: z.string().describe(
        "ISO-8601 datetime. Only jobs Hirebase first saved before this " +
            "time.",
    ).optional(),
    signals: z.array(z.enum(["reposted"])).min(1).describe(
        'Only jobs carrying one of these signals. "reposted": the ' +
            "company closed the job and posted it again.",
    ).optional(),
    visa: zFlag.describe(
        "true for only jobs that offer visa sponsorship.",
    ).optional(),
    hide_recruiting_agencies: zFlag.describe(
        "true to leave out jobs posted by recruiting agencies.",
    ).optional(),
    include_no_salary: zFlag.describe(
        "With a salary filter: true to also keep jobs with no posted " +
            "salary.",
    ).optional(),
    include_yoe: zFlag.describe(
        "With a yoe filter: true to also keep jobs with no stated years " +
            "of experience.",
    ).optional(),
    filter_incomplete_jobs: zFlag.describe(
        "true to leave out jobs with incomplete listing data.",
    ).optional(),
};
