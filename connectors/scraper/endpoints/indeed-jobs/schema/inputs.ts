import { z } from "zod";
import { zIndeedJobCountry } from "../../../schema/common.ts";

/**
 * `POST /indeed/jobs` request body: the vendor mirror, optionality only
 * (D25): the vendor's own defaults are stated in each `describe`, none is
 * applied here.
 */
export const zIndeedJobsBody = z.object({
    keyword: z.string().describe(
        'Search keyword or job title, e.g. "software engineer". Vendor ' +
            'default "" (all jobs).',
    ).optional(),
    location: z.string().describe(
        'City, state, or region, e.g. "San Francisco, CA". Vendor default ' +
            '"" (nationwide).',
    ).optional(),
    country: zIndeedJobCountry.describe(
        'Indeed country code (62 countries). Vendor default "US".',
    ).optional(),
    maxItems: z.number().int().min(1).describe(
        "Maximum job listings to return (positive integer; the upper bound " +
            "is your plan's). Vendor default 20.",
    ).optional(),
    radius: z.string().describe(
        "Search radius from the location, as a number string. Vendor " +
            'default "35".',
    ).optional(),
    radiusUnit: z.enum(["miles", "km"]).describe(
        'Unit of `radius`. Vendor default "miles".',
    ).optional(),
    sort: z.enum(["relevance", "date"]).describe(
        'Sort order. Vendor default "relevance".',
    ).optional(),
    fromDays: z.string().describe(
        "Only jobs posted within this many days, as a number string, e.g. " +
            '"7". Vendor default "" (no recency filter).',
    ).optional(),
    jobType: z.enum([
        "",
        "fulltime",
        "parttime",
        "contract",
        "temporary",
        "internship",
    ]).describe(
        'Employment type. Vendor default "" (all types).',
    ).optional(),
    remote: z.enum(["", "remote", "hybrid"]).describe(
        'Work arrangement. Vendor default "" (all arrangements).',
    ).optional(),
    jobKeys: z.array(z.string().min(1)).describe(
        "Look up specific jobs by their Indeed job keys (the `jk` value of " +
            "a viewjob URL). When given, this overrides the keyword and " +
            "location search.",
    ).optional(),
    fields: z.array(z.enum([
        "*",
        "id",
        "title",
        "urls",
        "description",
        "snippet",
        "salary",
        "location",
        "company",
        "dates",
        "workArrangement",
        "refNum",
        "classification",
        "benefits",
        "socialInsurance",
        "apply",
        "locationCount",
        "photos",
        "signals",
        "requirements",
        "requiredDocuments",
        "meta",
    ])).describe(
        "Fields to include per job. Omit for the defaults (id, title, " +
            "urls, description, snippet, salary, location, company, dates, " +
            'workArrangement). Use ["*"] for every field.',
    ).optional(),
}).strict();
