import { z } from "zod";
import {
    zExperience,
    zGeoLocations,
    zLocationType,
    zRange,
    zStrings,
} from "../../../schema/common.ts";

/** POST /v2/jobs/salary-benchmark body — the faithful mirror, every field
 *  optional. "One of public_url / job_title" is stated at the binding in
 *  endpoint.ts, as a union of two `.required` arms. */
export const zSalaryBenchmarkBody = z.strictObject({
    public_url: z.string().describe(
        "Public URL of a job posting to benchmark; the role's attributes " +
            "are read from the posting. Takes precedence over the fields " +
            "below.",
    ).optional(),
    job_title: z.string().min(1).describe(
        "The role's title, when no URL is given.",
    ).optional(),
    job_titles: zStrings.describe(
        "Other titles for the same kind of role, to widen the comparison.",
    ).optional(),
    yoe_range: zRange.describe(
        'Years-of-experience band, e.g. {"min": 5, "max": 8}.',
    ).optional(),
    experience_levels: z.array(zExperience).min(1).describe(
        "A hint used to pick a years-of-experience band when yoe_range " +
            "is not set. Not a filter.",
    ).optional(),
    description: z.string().describe(
        "Job description or notes, used to find comparable postings.",
    ).optional(),
    salary_range: z.strictObject({
        min: z.number().min(0).describe("Low end of the proposed range.")
            .optional(),
        max: z.number().min(0).describe("High end of the proposed range.")
            .optional(),
        currency: z.string().length(3).describe(
            "Three-letter currency code. Must match the market's currency " +
                "for a percentile to be returned.",
        ).optional(),
        period: z.enum(["hourly", "weekly", "monthly", "yearly"]).describe(
            "Pay period; non-yearly ranges are annualized.",
        ).optional(),
    }).describe(
        "A proposed pay range to rank against the market. When given, " +
            "the report says which percentile it sits at.",
    ).optional(),
    geo_locations: zGeoLocations.describe(
        'Where to compare, e.g. [{"country": "United States"}]. ' +
            "Country-only entries are fine.",
    ).optional(),
    location_types: z.array(zLocationType).min(1).describe(
        "Work arrangements to compare within.",
    ).optional(),
    industry: zStrings.describe("Industries to compare within.").optional(),
    sub_industry: zStrings.describe(
        "Sub-industries to compare within; replaces industry when set.",
    ).optional(),
    days_ago: z.number().int().min(1).max(365).describe(
        "Lookback window in days (default 90).",
    ).optional(),
    include_expired: z.boolean().describe(
        "Include jobs that closed inside the window (default true), " +
            "which deepens the sample. false compares only against jobs " +
            "open now.",
    ).optional(),
});
