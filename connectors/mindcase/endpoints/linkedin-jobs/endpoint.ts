import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinJobsBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/jobs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Jobs",
        summary: "LinkedIn job postings: title, company, location, " +
            "description, salary and full company profile. Search by job " +
            "title, location and filters.",
        description: "LinkedIn job postings: title, company, location, " +
            "description, salary and full company profile. Search by job " +
            "title, location and filters. Returns one row per job with " +
            "jobUrl, jobId, jobTitle, description, employmentType, " +
            "workplaceType, remoteAllowed, experienceLevel, applicants, " +
            "posted, expires, applyUrl, easyApply, industries, salaryMin, " +
            "salaryMax, salaryCurrency, salaryPeriod, ats, benefits, " +
            "recruiterName, recruiterUrl, city, state, country, " +
            "companyName, companyId, companySlug, companyUrl, companyLogo " +
            "and 3 more fields. For the hiring company's profile use " +
            "mindcase#linkedin/companies; for Indeed postings use " +
            "mindcase#indeed/jobs; for Glassdoor use " +
            "mindcase#glassdoor/jobs. $0.001 per job plus a flat $0.001 " +
            "search fee per run, charged even when nothing is found.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/jobs",
        categories: ["linkedin", "jobs"],
        notes: [
            "Adds a flat $0.001 search fee to every run, including runs " +
            "that find nothing.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/jobs",
    request: { method: "POST", path: "/v1/data/linkedin/jobs/run" },
    input: {
        schema: {
            body: zLinkedinJobsBody.extend({
                maxResults: zLinkedinJobsBody.shape.maxResults.unwrap().min(1)
                    .describe("Jobs to return. Required, at least 1."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                row: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "jobs",
                    description: "jobs returned",
                    consumes: { credit: "default", amount: 0.001 },
                },
                search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { row: rows, search: 1 } };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return { counts: { row: delivered, search: 1 } };
        },
    },
});
