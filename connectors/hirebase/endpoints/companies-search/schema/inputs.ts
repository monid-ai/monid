import { z } from "zod";
import {
    zCompanySize,
    zFundingType,
    zGeoLocations,
    zSortOrder,
    zStrings,
} from "../../../schema/common.ts";

/** POST /v2/hirebase/companies/search body — all optional, unknown 422. */
export const zCompaniesSearchBody = z.strictObject({
    query: z.string().min(1).describe(
        "Full-text search across company name, description, products and " +
            'services, tech stack and culture, e.g. "climate tech".',
    ).optional(),
    company_name: z.string().min(1).describe(
        "Exact or partial company name.",
    ).optional(),
    keywords: zStrings.describe(
        "Terms to match across the company's text.",
    ).optional(),
    industries: zStrings.describe(
        'Industries, e.g. ["Tech, Software & IT Services", ' +
            '"Healthcare"].',
    ).optional(),
    subindustries: zStrings.describe(
        'Sub-industries, e.g. ["Fintech"].',
    ).optional(),
    company_types: z.array(zCompanySize).min(1).describe(
        "Headcount buckets (named company_types for historical reasons). " +
            "There is no min/max headcount filter; combine buckets.",
    ).optional(),
    types: z.array(z.enum([
        "Startup",
        "Enterprise",
        "Mid-Size",
        "Small Business",
        "Non-Profit",
        "Government",
        "Franchise",
        "Academic",
        "Other",
    ])).min(1).describe("Kinds of company.").optional(),
    hq_geolocations: zGeoLocations.describe(
        "Headquarters locations, OR'd together.",
    ).optional(),
    funding_types: z.array(zFundingType).min(1).describe(
        'Latest funding stage. The "Post IPO" values are a proxy for ' +
            "public companies.",
    ).optional(),
    linkedin_link: z.string().describe(
        "Exact LinkedIn company URL, starting https://www.linkedin.com/.",
    ).optional(),
    company_link: z.string().describe("Company website URL.").optional(),
    parent_company: z.string().describe("Parent company name.").optional(),
    hide_recruiter_agencies: z.boolean().describe(
        "Leave out recruiting and staffing agencies (default true). Send " +
            "false to include them.",
    ).optional(),
    is_recruiting_agency: z.boolean().describe(
        "true for only recruiting agencies; false for none.",
    ).optional(),
    sort_by: z.enum([
        "hottest",
        "relevance",
        "clout",
        "rated",
        "size",
        "newest",
    ]).describe(
        "hottest (default): relevance when there is a text query, " +
            "otherwise prominence. size: largest first. newest: most " +
            "recently founded first.",
    ).optional(),
    sort_order: zSortOrder.describe(
        "Direction for size, newest, clout and rated (default desc).",
    ).optional(),
    page: z.number().int().min(1).describe("Page number (default 1).")
        .optional(),
    limit: z.number().int().min(1).describe(
        "Companies per page, 1-100. Each company returned is billed.",
    ).optional(),
});
