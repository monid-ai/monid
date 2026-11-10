import { defineEndpoint } from "@shared/core";
import { zCleraJobSearchBody } from "./schema/inputs.ts";

/**
 * Clera job search — `POST https://www.getclera.com/api/public/jobs/search`.
 * The output drops Clera's `{success, data}` wrapper and adds a `url` per
 * job: `/jobs/<company_slug>/<slug>` redirects to the canonical posting.
 */
export default defineEndpoint({
    meta: {
        displayName: "Clera Job Search",
        summary: "Search open startup roles by keyword, city, role and salary.",
        description: "Searches the open roles on getclera.com/search. " +
            "Filter by free text ('search_term'), exact city names " +
            "('cities'), workplace type ('work_types'), role family " +
            "('role_cluster'), the company's latest funding stage " +
            "('company_last_funding_round'), a salary floor ('min_salary') " +
            "and visa sponsorship. Returns total_jobs, has_more and a page " +
            "of jobs, each with position, company name, salary and OTE " +
            "range, currency, workplace type, cities and a getclera.com " +
            "url to the posting. Without a search_term, results come " +
            "newest first. This is a curated startup board, not an " +
            "aggregator: a few hundred roles at most, mostly pre-seed to " +
            "Series A in the US and Germany. City names must match " +
            "exactly, so call clera#job-filters first to get the values " +
            "in use. It does not apply to jobs or return job descriptions.",
        docsUrl: "https://www.getclera.com/search",
        categories: ["jobs"],
        notes: [
            "An empty top_jobs list with total_jobs 0 is a normal answer, " +
            "not an error: the board is small and filters combine with AND.",
            "page × per_page is capped by the page maximum of 40, so at " +
            "most 1,920 results are reachable for one query.",
        ],
    },
    endpoint: "/job-search",
    request: { method: "POST", path: "/api/public/jobs/search" },
    input: { schema: { body: zCleraJobSearchBody } },
    output: {
        fromResponse: ({ data, utils }) => {
            const result = utils.json.get(data.output, "$.data") as {
                top_jobs: Array<Record<string, unknown>>;
            };
            return {
                ...result,
                top_jobs: result.top_jobs.map((job) => ({
                    ...job,
                    url: "https://www.getclera.com/jobs/" +
                        encodeURIComponent(String(job.company_slug)) + "/" +
                        encodeURIComponent(String(job.slug)),
                })),
            };
        },
    },
});
