import { z } from "zod";
import { zIndeedJobCountry } from "../../../schema/common.ts";

/**
 * `POST /indeed/jobs` request body: the vendor mirror, optionality only
 * (D25): the vendor's own defaults are stated in each `describe`, none is
 * applied here.
 */
export const zIndeedJobsBody = z.object({
    keyword: z.string().optional().describe(
        'Search keyword or job title, e.g. "software engineer". Vendor ' +
            'default "" (all jobs).',
    ),
    location: z.string().optional().describe(
        'City, state, or region, e.g. "San Francisco, CA". Vendor default ' +
            '"" (nationwide).',
    ),
    country: zIndeedJobCountry.optional().describe(
        'Indeed country code (62 countries). Vendor default "US".',
    ),
    maxItems: z.number().int().min(1).optional().describe(
        "Maximum job listings to return (positive integer; the upper bound " +
            "is your plan's). Vendor default 20.",
    ),
    radius: z.string().optional().describe(
        "Search radius from the location, as a number string. Vendor " +
            'default "35".',
    ),
    radiusUnit: z.enum(["miles", "km"]).optional().describe(
        'Unit of `radius`. Vendor default "miles".',
    ),
    sort: z.enum(["relevance", "date"]).optional().describe(
        'Sort order. Vendor default "relevance".',
    ),
    fromDays: z.string().optional().describe(
        "Only jobs posted within this many days, as a number string, e.g. " +
            '"7". Vendor default "" (no recency filter).',
    ),
    jobType: z.enum([
        "",
        "fulltime",
        "parttime",
        "contract",
        "temporary",
        "internship",
    ]).optional().describe(
        'Employment type. Vendor default "" (all types).',
    ),
    remote: z.enum(["", "remote", "hybrid"]).optional().describe(
        'Work arrangement. Vendor default "" (all arrangements).',
    ),
    jobKeys: z.array(z.string().min(1)).optional().describe(
        "Look up specific jobs by their Indeed job keys (the `jk` value of " +
            "a viewjob URL). When given, this overrides the keyword and " +
            "location search.",
    ),
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
    ])).optional().describe(
        "Fields to include per job. Omit for the defaults (id, title, " +
            "urls, description, snippet, salary, location, company, dates, " +
            'workArrangement). Use ["*"] for every field.',
    ),
}).strict();
