import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNaukriJobBody } from "./schema/inputs.ts";

/**
 * Mindcase `naukri/job`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Naukri Jobs",
        summary:
            "Pull details for a specified number of Naukri job postings, " +
            "including title, company, and experience.",
        description:
            "Pull details for a specified number of Naukri job postings, " +
            "including title, company, and experience. Returns one row " +
            "per job with jobUrl, jobId, jobTitle, company, companyId, " +
            "location, minExperienceYrs, maxExperienceYrs, salaryMin, " +
            "salaryMax, skills, description, requirementsSummary, " +
            "jobType, posted, vacancies, views, applicants, applyUrl, " +
            "appliesOnCompanySite, hasQuestionnaire, workplaceType, " +
            "hybridDetail, industry, department, roleCategory, role, " +
            "educationUg, educationPg, listingSource and 20 more fields. " +
            "$0.002 per job; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/naukri/job",
        categories: ["jobs"],
        notes: [
            "`maxResults` must be at least 50 here; the raw API reads 0 " +
            "or blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/naukri/job",
    request: { method: "POST", path: "/v1/data/naukri/job/run" },
    input: {
        schema: {
            body: zNaukriJobBody.extend({
                maxResults: zNaukriJobBody.shape.maxResults.unwrap().min(50)
                    .describe(
                        "Number of jobs to return (minimum 50). Required, at least 50.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
