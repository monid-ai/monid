import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { LIMIT_MAX } from "../../schema/common.ts";
import {
    zCompanyJobsPathParams,
    zCompanyJobsQueryParams,
} from "./schema/inputs.ts";

/** GET /v2/hirebase/companies/{company_slug}/jobs — a company's board. */
export default defineEndpoint({
    meta: {
        displayName: "List Company Jobs",
        summary: "List one company's open jobs by its slug, with the " +
            "total number of openings.",
        description: "Everything one company is hiring for right now: " +
            "its open jobs with title, description, salary range, " +
            "locations, apply link and source, plus total_count for the " +
            "whole careers page and the list of job categories it is " +
            "hiring in. Use it when the company is already known and " +
            "the question is about its hiring as a whole: how many roles " +
            "it has open, which teams are growing, what a sales prospect " +
            "or a competitor is investing in. To filter one company's " +
            "jobs by title, location, seniority or date, use " +
            "hirebase#jobs/search with company_slug or company_domain " +
            "instead, which takes every filter. The slug comes from " +
            "hirebase#companies/search or from any job's company_slug.",
        docsUrl:
            "https://www.hirebase.org/docs/api-reference/companies/get-company-jobs",
        categories: ["jobs", "company-enrichment"],
        notes: [
            "An unknown slug answers 200 with no jobs rather than 404, " +
            "and bills nothing.",
            "Consecutive pages can overlap; de-duplicate on _id when " +
            "paging.",
        ],
    },
    endpoint: "/companies/{company_slug}/jobs",
    request: {
        method: "GET",
        path: "/hirebase/companies/{company_slug}/jobs",
    },
    // `limit` REQUIRED and CAPPED at the binding (design D25).
    input: {
        schema: {
            pathParams: zCompanyJobsPathParams,
            queryParams: zCompanyJobsQueryParams.extend({
                limit: zCompanyJobsQueryParams.shape.limit.unwrap()
                    .max(LIMIT_MAX),
            }),
        },
    },
    usage: {
        /** 1 unit of the jobs allowance per job returned. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "jobs",
            consumes: { credit: "jobs", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
    },
});
