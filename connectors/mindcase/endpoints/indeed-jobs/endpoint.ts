import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zIndeedJobsBody } from "./schema/inputs.ts";

/**
 * Mindcase `indeed/jobs`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indeed Jobs",
        summary: "Indeed job listings: title, company, salary, location, " +
            "skills, hiring-demand signals and apply links. By keyword " +
            "and location, or by job ID.",
        description: "Indeed job listings: title, company, salary, location, " +
            "skills, hiring-demand signals and apply links. By keyword " +
            "and location, or by job ID. Returns one row per job with " +
            "jobId, jobUrl, applyUrl, jobTitle, normalizedTitle, " +
            "companyName, companyKey, company, city, state, country, " +
            "postalCode, streetAddress, fullAddress, latitude, longitude, " +
            "salaryMin, salaryMax, salaryCurrency, salaryPeriod, " +
            "workplaceType, employmentType, workSetting, educationLevel, " +
            "experienceLevel, certifications, physicalRequirements, " +
            "skills, occupation, occupationCategories and 18 more fields. " +
            "Search Indeed by keyword + location, or look up specific " +
            "Indeed job IDs directly. $5e-05 per job; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/indeed/jobs",
        categories: ["jobs"],
        notes: [
            "`maxItems` does not apply to `jobKeys`: those return one row " +
            "per entry.",
            "`maxItems` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/indeed/jobs",
    request: { method: "POST", path: "/v1/data/indeed/jobs/run" },
    input: {
        schema: {
            body: zIndeedJobsBody.extend({
                maxItems: zIndeedJobsBody.shape.maxItems.unwrap().min(1)
                    .describe(
                        "Number of job listings to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 5e-05 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                (body.keyword ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.jobKeys?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxItems : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
