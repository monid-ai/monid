import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGlassdoorJobsBody } from "./schema/inputs.ts";

/**
 * Mindcase `glassdoor/jobs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Jobs",
        summary:
            "Glassdoor job postings with title, normalized title, company " +
            "and location. Search by keyword and location.",
        description:
            "Glassdoor job postings with title, normalized title, company " +
            "and location. Search by keyword and location. Returns one " +
            "row per job with jobId, jobUrl, jobTitle, normalizedTitle, " +
            "companyName, companyId, location, state, country, latitude, " +
            "longitude, salaryMin, salaryMax, salaryCurrency, " +
            "salaryPeriod, posted, employmentType, easyApply, sponsored, " +
            "skills, education, experienceYears, applyUrl, " +
            "jobDescription, salaryDetails, company. For employee reviews " +
            "use mindcase#glassdoor/reviews; for LinkedIn postings with " +
            "salary use mindcase#linkedin/jobs. $0.0025 per job; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/glassdoor/jobs",
        categories: ["jobs"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/glassdoor/jobs",
    request: { method: "POST", path: "/v1/data/glassdoor/jobs/run" },
    input: {
        schema: {
            body: zGlassdoorJobsBody.extend({
                maxResults: zGlassdoorJobsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe("How many jobs to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
