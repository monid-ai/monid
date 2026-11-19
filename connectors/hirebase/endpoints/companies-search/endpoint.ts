import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { LIMIT_MAX } from "../../schema/common.ts";
import { zCompaniesSearchBody } from "./schema/inputs.ts";

/** POST /v2/hirebase/companies/search — billed per company returned. */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary: "Find companies by what they do, industry, size, HQ " +
            "location and funding stage.",
        description: "Search the companies Hirebase tracks hiring for. " +
            "Full-text query over name, description, products, tech " +
            "stack and culture, plus filters for industry and " +
            "sub-industry, headcount bucket, company kind (startup, " +
            "enterprise, non-profit, government...), headquarters " +
            "location, latest funding stage, website or LinkedIn URL. " +
            "Returns per company: name, slug, website, LinkedIn URL, " +
            "logo, description, industry and sub-industries, headcount " +
            "range, founded year, headquarters, and funding details " +
            "where known. The company slug each row carries is the key " +
            "for hirebase#companies/{company_slug}, " +
            "hirebase#companies/{company_slug}/jobs and the " +
            "company_slug filter on hirebase#jobs/search. To find " +
            "companies by what they are HIRING for (a role, a skill, a " +
            "location), search jobs instead and read each job's " +
            "company_data. Suited for building account lists, resolving " +
            "a company name or domain to a Hirebase slug, and enriching " +
            "a CRM.",
        docsUrl:
            "https://www.hirebase.org/docs/api-reference/companies/search-companies",
        categories: ["company-enrichment", "jobs"],
        notes: [
            "Different companies can share a name. Check company_link " +
            "(the website) on a row before trusting its slug.",
            "total_count is capped at 1001, so judge a filter by the rows " +
            "returned, not by the count.",
            "Recruiting agencies are hidden by default here " +
            "(hide_recruiter_agencies), the opposite of job search, where " +
            "the filter is named hide_recruiting_agencies and is off by " +
            "default.",
        ],
    },
    endpoint: "/companies/search",
    request: { method: "POST", path: "/hirebase/companies/search" },
    // `limit` REQUIRED and CAPPED at the binding (design D25).
    input: {
        schema: {
            body: zCompaniesSearchBody.extend({
                limit: zCompaniesSearchBody.shape.limit.unwrap()
                    .max(LIMIT_MAX),
            }),
        },
    },
    usage: {
        /** 1 unit of the companies allowance per company returned.
         *  Settle is inherited: the provider evidence counts
         *  `$.companies`. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "companies",
            consumes: { credit: "companies", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.limit },
        }),
    },
});
