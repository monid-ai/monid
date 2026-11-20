import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobsSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /jobs — search live listings. FREE (`GET /v1/pricing`: "GET /jobs
 * (search)" is on the free list; it draws the shared `jobs.list` quota, one
 * unit per row returned).
 *
 * PUBLIC identity `jobs/search` (design D22): the native path `/jobs` would
 * derive `worklittle#jobs`, which reads as the provider rather than the
 * action.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Jobs",
        summary:
            "Search 7.5M+ live jobs from company career pages by role, place, salary, visa, and more, or read one job in full.",
        description: "Search Worklittle's index of live job postings, " +
            "read directly from company career pages and refreshed " +
            "hourly. Filter by job title " +
            "(comma-separated roles, '-word' exclusions), employer slug " +
            "(include or exclude), location text, distance from a " +
            "point (near_lat/near_lng/radius_km), country, US state, " +
            "remote-only, workplace type, employment type, seniority, " +
            "posting age, visa sponsorship (including H-1B filers) and " +
            "minimum salary. Each result carries the title, employer " +
            "profile, locations with coordinates, listed salary, " +
            "employment and workplace type, seniority, visa signal, " +
            "and posting date. Pages of up " +
            "to 50, continued with `meta.next_cursor`. Results do NOT " +
            "carry the job description: send a result's `id` back as " +
            "`job_id` for that one job in full (description text, every " +
            "location, employer profile, `closed_at` when it has come " +
            "down), and pass it as `job_ids` to worklittle#apply to apply. Resolve an employer name to " +
            "its slug with worklittle#companies/search. For pay " +
            "questions about a role (not individual jobs) use " +
            "worklittle#jobs/salary-average instead of paging through " +
            "results. Free.",
        docsUrl: "https://docs.worklittle.com/jobs/api/search-jobs",
        categories: ["jobs"],
        notes: [
            "Only jobs Worklittle can apply to are returned to API keys, " +
            "so a page can hold fewer rows than `limit` while " +
            "`meta.next_cursor` still continues the list.",
            "near_lat and near_lng must be sent together; `location` is " +
            "then only a label and is not used as a filter. remote=true " +
            "or location='remote' disables the distance search.",
            "No posting-age cutoff is applied unless posted_within_days " +
            "or since is set, so an unfiltered search includes older " +
            "listings that are still open.",
        ],
    },
    endpoint: "/jobs/search",
    request: { method: "GET", path: "/jobs" },
    input: {
        schema: {
            queryParams: zJobsSearchQueryParams.strict(),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
