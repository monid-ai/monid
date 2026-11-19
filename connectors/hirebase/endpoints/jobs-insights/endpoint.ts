import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobsInsightsBody } from "./schema/inputs.ts";

/** POST /v2/jobs/insights — aggregates over a search-shaped cohort. */
export default defineEndpoint({
    meta: {
        displayName: "Job Market Insights",
        summary: "Aggregate salary, demand, top employers, skills and " +
            "remote share for any slice of the job market.",
        description: "Describe a slice of the job market with the same " +
            "filters as hirebase#jobs/search (titles, location, " +
            "industry, company, experience, dates...) and get the " +
            "numbers for it in one call instead of paging through jobs: " +
            "how many jobs and companies match, posted-salary " +
            "percentiles overall and by experience level and by " +
            "remote/hybrid/in-person, the split by level, employment " +
            "type, company size, industry and education, the top " +
            "locations, top hiring companies, most-requested " +
            "technologies, skills and benefits, the visa-sponsorship " +
            "rate, and how fresh the postings are. Costs one unit " +
            "however many jobs the cohort holds. Suited for answering " +
            '"what does this role pay", "who is hiring the most for ' +
            'X", "which skills are in demand for Y", market reports ' +
            "and compensation research. To benchmark ONE role's pay with " +
            "a confidence grade and a verdict on a proposed range, use " +
            "hirebase#jobs/salary-benchmark.",
        docsUrl: "https://www.hirebase.org/docs/api-reference/jobs/insights",
        categories: ["jobs"],
        notes: [
            "Salary figures come from postings that state pay, so the " +
            "salary sample is smaller than the job count; read the count " +
            "beside each percentile.",
            "headline.total_count is how many jobs match; the figures " +
            "are computed over at most 500 of them " +
            "(headline.sample_size).",
            "A cohort that matches nothing still counts as a request. " +
            "hirebase#jobs/estimate checks for free whether a slice is " +
            "empty.",
        ],
    },
    request: { method: "POST", path: "/jobs/insights" },
    input: { schema: { body: zJobsInsightsBody } },
    usage: {
        /** 1 unit of the insights allowance per request. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "insights request",
            consumes: { credit: "insights", amount: 1 },
        },
    },
});
