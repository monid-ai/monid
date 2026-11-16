import { z } from "zod";

/**
 * johnvc/workday-careers-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zWorkdayCareersApiOutputItem = z.object({
    resultType: z.enum(["job", "error"]).describe(
        "Row kind discriminator: 'job' for a job posting, 'error' for a start URL that could not be scraped. Filter on it to separate data from diagnostics.",
    ).optional(),
    title: z.any().describe("The job posting's title.").optional(),
    company: z.any().describe(
        "Hiring organization name from the job record, falling back to the Workday tenant name.",
    ).optional(),
    tenant: z.any().describe(
        "The Workday tenant identifier parsed from the careers URL. Use it to join rows back to a tenant-discovery dataset.",
    ).optional(),
    siteId: z.any().describe(
        "The Workday career-site slug within the tenant (one tenant can host several sites).",
    ).optional(),
    sourceUrl: z.any().describe(
        "The start URL this row came from, exactly as provided in the input.",
    ).optional(),
    url: z.any().describe("Public job posting page URL.").optional(),
    applyUrl: z.any().describe(
        "Direct application URL (the job URL plus /apply).",
    ).optional(),
    jobReqId: z.any().describe(
        "The employer's job requisition ID (for example JR1990000). Stable identifier for deduplication across runs.",
    ).optional(),
    jobPostingId: z.any().describe(
        "Workday's posting slug identifier (detail mode only).",
    ).optional(),
    workdayInternalId: z.any().describe(
        "Workday's internal GUID for the posting (detail mode only).",
    ).optional(),
    externalPath: z.any().describe(
        "The posting's path fragment on the careers site, as returned by the list endpoint.",
    ).optional(),
    locationsText: z.any().describe(
        "Location summary as shown on the job card (a single location or e.g. '11 Locations').",
    ).optional(),
    primaryLocation: z.any().describe(
        "The posting's primary location (detail mode only).",
    ).optional(),
    additionalLocations: z.any().describe(
        "Every additional location on multi-location postings (detail mode only).",
    ).optional(),
    country: z.any().describe(
        "Country of the primary location (detail mode only).",
    ).optional(),
    countryCode: z.any().describe(
        "ISO alpha-2 country code of the primary location (detail mode only).",
    ).optional(),
    postedOn: z.any().describe(
        "Relative posted date exactly as the careers site shows it.",
    ).optional(),
    postedDate: z.any().describe("Exact ISO posting date (detail mode only).")
        .optional(),
    endDate: z.any().describe(
        "ISO date the posting stops accepting applications, when the employer sets one (detail mode only).",
    ).optional(),
    timeLeftToApply: z.any().describe(
        "Human-readable time remaining to apply, when the employer sets an end date (detail mode only).",
    ).optional(),
    timeType: z.any().describe(
        "Employment time type such as Full Time or Part Time (detail mode only).",
    ).optional(),
    remoteType: z.any().describe(
        "Work arrangement label when the site exposes one (for example Remote, Flex, Onsite).",
    ).optional(),
    canApply: z.any().describe(
        "Whether the posting currently accepts applications (detail mode only).",
    ).optional(),
    descriptionHtml: z.any().describe(
        "Full job description as rich HTML (detail mode, when descriptionFormat is html or both).",
    ).optional(),
    descriptionText: z.any().describe(
        "Full job description as clean plain text (detail mode, when descriptionFormat is text or both).",
    ).optional(),
    salaryText: z.any().describe(
        "Best-effort pay range snippet extracted from the description when the employer publishes one. Null when no range is stated.",
    ).optional(),
    salaryMin: z.any().describe(
        "Lower bound of the extracted pay range. Null when no range is stated.",
    ).optional(),
    salaryMax: z.any().describe(
        "Upper bound of the extracted pay range. Null when no range is stated.",
    ).optional(),
    salaryCurrency: z.any().describe(
        "Currency of the extracted pay range (ISO code where the symbol maps cleanly). Null when no range is stated.",
    ).optional(),
    scrapedAt: z.any().describe("UTC timestamp of this run.").optional(),
    totalJobsOnSite: z.any().describe(
        "Total number of jobs the careers site reported at scrape time (before any max cap or filters).",
    ).optional(),
    errorMessage: z.any().describe(
        "Human-readable reason a start URL failed (rows with resultType 'error' only).",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zWorkdayCareersApiOutput = z.array(
    zWorkdayCareersApiOutputItem.or(z.record(z.string(), z.unknown())),
);
