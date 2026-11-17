import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zUpworkJobsBody } from "./schema/inputs.ts";

/**
 * Mindcase `upwork/jobs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Upwork Jobs",
        summary: "Extract Upwork job postings with their title, description, " +
            "budget, required skills, and client details.",
        description:
            "Extract Upwork job postings with their title, description, " +
            "budget, required skills, and client details. Returns one row " +
            "per job with jobTitle, jobUrl, jobId, jobDescription, " +
            "jobAccess, jobStatus, posted, jobType, fixedBudget, " +
            "hourlyRateMin, hourlyRateMax, experienceLevel, " +
            "projectLength, weeklyWorkload, category, categoryGroup, " +
            "occupation, skills, skillGroups, projectType, featuredJob, " +
            "contractToHire, positionsToHire, applicants, interviewing, " +
            "invitesSent, unansweredInvites, hired, client, " +
            "clientOtherOpenPostings and 14 more fields. $0.003 per job; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/upwork/jobs",
        categories: ["jobs"],
        notes: [
            "`limit` must be at least 5 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/upwork/jobs",
    request: { method: "POST", path: "/v1/data/upwork/jobs/run" },
    input: {
        schema: {
            body: zUpworkJobsBody.extend({
                limit: zUpworkJobsBody.shape.limit.unwrap().min(5).describe(
                    "Number of jobs to return (5–500). Required, at least 5.",
                ),
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
            const rows = body.limit;
            return { counts: { RESULT: rows } };
        },
    },
});
