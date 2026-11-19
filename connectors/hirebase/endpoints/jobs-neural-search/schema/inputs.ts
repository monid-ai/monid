import { z } from "zod";
import {
    zCompanySize,
    zExperience,
    zGeoLocations,
    zJobType,
    zLocationType,
    zRange,
    zSortOrder,
    zStrings,
} from "../../../schema/common.ts";

/** The semantic half of a neural search. Send ONE of query / job_ids /
 *  artifact_id. */
export const zNeuralVector = z.strictObject({
    query: z.string().min(1).describe(
        'Plain-English description of the job wanted, e.g. "backend ' +
            'engineer at an early-stage climate startup".',
    ).optional(),
    job_ids: zStrings.describe(
        '"More like these": Hirebase job _ids whose meaning is used as ' +
            "the query.",
    ).optional(),
    artifact_id: z.string().min(1).describe(
        "Id of a resume previously uploaded to Hirebase, to rank jobs by " +
            "fit to that resume.",
    ).optional(),
    score_threshold: z.number().min(0).max(1).describe(
        "Minimum similarity (0-1) for a job to be returned (default 0).",
    ).optional(),
});

/**
 * The filter half. Hirebase IGNORES unknown fields inside `lexical`
 * (a misspelled filter silently returns unfiltered results), so this
 * object is strict here: the mistake fails before the wire instead.
 */
export const zNeuralLexical = z.strictObject({
    job_titles: zStrings.describe("Job titles, OR'd together.").optional(),
    keywords: zStrings.describe(
        "Keywords to match in the job description.",
    ).optional(),
    company_keywords: zStrings.describe(
        "Keywords to match in the company's description, products and " +
            "services.",
    ).optional(),
    company_name: z.string().min(1).describe(
        "Company name, case-insensitive.",
    ).optional(),
    company_domain: zStrings.describe(
        'Company websites, e.g. ["ford.com"].',
    ).optional(),
    company_slug: zStrings.describe("Hirebase company slugs.").optional(),
    location_types: z.array(zLocationType).min(1).describe(
        "Work arrangements to include.",
    ).optional(),
    geo_locations: zGeoLocations.describe(
        "Locations to search, OR'd together.",
    ).optional(),
    experience: z.array(zExperience).min(1).describe(
        "Experience levels to include.",
    ).optional(),
    yoe: zRange.describe("Years of experience required.").optional(),
    include_yoe: z.boolean().describe(
        "With a yoe filter: true to also keep jobs with no stated years.",
    ).optional(),
    company_types: z.array(zCompanySize).min(1).describe(
        "Hiring-company headcount buckets.",
    ).optional(),
    days_ago: z.number().int().min(0).describe(
        "Only jobs posted within this many days.",
    ).optional(),
    ingested_after: z.string().describe(
        "ISO-8601 datetime. Only jobs first saved at or after this time.",
    ).optional(),
    ingested_before: z.string().describe(
        "ISO-8601 datetime. Only jobs first saved before this time.",
    ).optional(),
    salary: zRange.describe("Posted salary range.").optional(),
    include_no_salary: z.boolean().describe(
        "With a salary filter: true to also keep jobs with no posted " +
            "salary.",
    ).optional(),
    currency: z.string().length(3).describe(
        "Three-letter currency code for the salary filter.",
    ).optional(),
    job_types: z.array(zJobType).min(1).describe(
        "Employment types to include.",
    ).optional(),
    job_category: zStrings.describe("Job category tags.").optional(),
    industry: zStrings.describe("Industries of the hiring company.")
        .optional(),
    sub_industry: zStrings.describe(
        "Sub-industries of the hiring company.",
    ).optional(),
    visa: z.boolean().describe(
        "true for only jobs that offer visa sponsorship.",
    ).optional(),
    filter_incomplete_jobs: z.boolean().describe(
        "true to leave out jobs with incomplete listing data.",
    ).optional(),
    job_board: zStrings.describe("Only jobs from these sources.").optional(),
    exclude_job_board: zStrings.describe(
        "Leave out jobs from these sources.",
    ).optional(),
    sort_by: z.enum(["relevance", "date_posted", "salary", "yoe"]).describe(
        "Which matches are ranked when more than 2,500 jobs pass the " +
            "filters (e.g. date_posted ranks the 2,500 most recent). " +
            "Results always come back in similarity order.",
    ).optional(),
    sort_order: zSortOrder.describe("Direction for sort_by.").optional(),
});

/** POST /v2/jobs/neural-search body. `vector` is required by the live API
 *  (a lexical-only body answers 422, checked 2026-11-19). */
export const zJobsNeuralSearchBody = z.strictObject({
    vector: zNeuralVector.describe(
        "What the job should be like, by meaning. Required.",
    ),
    lexical: zNeuralLexical.describe(
        "Hard filters applied alongside the semantic ranking.",
    ).optional(),
    page: z.number().int().min(1).describe("Page number (default 1).")
        .optional(),
    limit: z.number().int().min(1).describe(
        "Jobs per page, 1-100. Each job returned is billed.",
    ).optional(),
});
