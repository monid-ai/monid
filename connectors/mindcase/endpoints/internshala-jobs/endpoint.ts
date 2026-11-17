import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInternshalaJobsBody } from "./schema/inputs.ts";

/**
 * Mindcase `internshala/jobs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Internshala Jobs",
        summary: "Internshala internships and jobs together in one search, " +
            "with title, listing type (Internship or Job), company, " +
            "location and pay. Search by keyword.",
        description:
            "Internshala internships and jobs together in one search, " +
            "with title, listing type (Internship or Job), company, " +
            "location and pay. Search by keyword. Returns one row per job " +
            "with jobId, jobUrl, jobTitle, listingType, company, " +
            "companyLogo, location, workFromHome, salaryText, salaryMin, " +
            "salaryMax, salaryCurrency, salaryPeriod, isUnpaid, duration, " +
            "durationMonths, minExperienceYrs, maxExperienceYrs, skills, " +
            "description, posted, postedDaysAgo, activelyHiring. $0.003 " +
            "per job; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/internshala/jobs",
        categories: ["jobs"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/internshala/jobs",
    request: { method: "POST", path: "/v1/data/internshala/jobs/run" },
    input: {
        schema: {
            body: zInternshalaJobsBody.extend({
                maxResults: zInternshalaJobsBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe("How many jobs to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.003 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
