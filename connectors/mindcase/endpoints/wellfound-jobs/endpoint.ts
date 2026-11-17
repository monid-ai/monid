import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWellfoundJobsBody } from "./schema/inputs.ts";

/**
 * Mindcase `wellfound/jobs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Wellfound Jobs",
        summary: "Startup jobs from Wellfound with title, primary role and " +
            "company details. Search by keyword.",
        description:
            "Startup jobs from Wellfound with title, primary role and " +
            "company details. Search by keyword. Returns one row per job " +
            "with jobId, jobUrl, jobTitle, primaryRole, companyName, " +
            "companyId, companySlug, companyUrl, companyLogo, " +
            "companyTagline, companySize, companyStage, companyValuation, " +
            "companyBadges, locations, remoteAllowed, workplaceType, " +
            "acceptedRemoteLocations, salaryText, salaryMin, salaryMax, " +
            "salaryCurrency, equityMin, equityMax, employmentType, " +
            "minExperienceYrs, posted, ats, autoPosted, description. " +
            "$0.012 per job; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/wellfound/jobs",
        categories: ["jobs"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/wellfound/jobs",
    request: { method: "POST", path: "/v1/data/wellfound/jobs/run" },
    input: {
        schema: {
            body: zWellfoundJobsBody.extend({
                maxResults: zWellfoundJobsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe("How many jobs to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.012 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
