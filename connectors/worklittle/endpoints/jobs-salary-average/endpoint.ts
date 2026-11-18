import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zJobsSalaryAverageQueryParams } from "./schema/inputs.ts";

const params = zJobsSalaryAverageQueryParams.extend({
    posted_within_days: zJobsSalaryAverageQueryParams.shape
        .posted_within_days.unwrap().min(0).optional(),
}).strict();

/**
 * GET /jobs/salary-average — annualized pay for a role across live
 * listings. FREE (`GET /v1/pricing`; draws the shared
 * `jobs.salary_average` quota, one unit per call). Worklittle 400s a call
 * with neither `q` nor `title`, so the binding requires one of them.
 */
export default defineEndpoint({
    meta: {
        displayName: "Job Salary Average",
        summary:
            "Average, minimum, and maximum annual salary for a role across live job listings.",
        description: "Answer 'what does this role pay?' from Worklittle's " +
            "live listings in one call: for a role (`title` or `q`), " +
            "narrowed by any of the job-search filters (location, " +
            "country, employer, seniority, employment type, workplace " +
            "type, posting age, visa sponsorship), it returns how many " +
            "jobs matched, how many list a salary, and the average, " +
            "lowest and highest annualized salary (each job counted at the " +
            "midpoint of its listed range) in one currency " +
            "(default USD). Hourly and monthly pay is annualized. It " +
            "returns numbers, not jobs: use worklittle#jobs/search to " +
            "list the openings behind them. No distance search here; " +
            "narrow by `location`, `location_or` or `country` instead. " +
            "Free.",
        docsUrl: "https://docs.worklittle.com/jobs/api/search-jobs",
        categories: ["jobs"],
        notes: [
            "Averages only jobs that list pay in the requested currency; " +
            "check `jobs_in_average` before quoting the number. " +
            "`average_salary` is null when no listing qualifies.",
            "At most the 8,000 most recent matching jobs are scanned, so " +
            "`matching_jobs` caps at 8,000 for very broad roles.",
        ],
    },
    request: { method: "GET", path: "/jobs/salary-average" },
    input: {
        schema: {
            queryParams: z.union([
                params.required({ title: true }),
                params.required({ q: true }),
            ]).describe(
                "Provide `title` or `q` (the role to price); every other " +
                    "filter is optional.",
            ),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
