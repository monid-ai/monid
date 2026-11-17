import { z } from "zod";
import {
    zCountries,
    zDomain,
    zIndustryGroups,
    zListPaging,
    zNaics,
    zUsd,
} from "../../../schema/common.ts";

/** GET /companies query params. */
export const zCompaniesQueryParams = z.object({
    search: z.string().min(1).optional().describe(
        "Keyword over company name, domain and description.",
    ),
    domain: zDomain.optional(),
    countries: zCountries.optional(),
    industryGroups: zIndustryGroups.optional(),
    naicsCode: zNaics.optional(),
    employeeCountBuckets: z.array(z.enum([
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "501-1000",
        "1001-5000",
        "5001-10000",
        "10001+",
        "unknown",
    ])).min(1).optional().describe("Headcount buckets (OR)."),
    foundedYearMin: z.number().int().optional(),
    foundedYearMax: z.number().int().optional(),
    minFundingUsdLast12mo: zUsd.optional().describe(
        "Raised at least this much (whole USD) in the last 12 months.",
    ),
    minKnownPeople: z.number().int().min(0).optional(),
    hasKnownFounder: z.boolean().optional(),
    sort: z.enum(["recent", "prominence"]).optional(),
    order: z.enum(["asc", "desc"]).optional().describe(
        "Direction for the prominence sort.",
    ),
    ...zListPaging,
}).strict();
