import { z } from "zod";
import { zWorklittleJobFilters } from "../../../schema/filters.ts";

/**
 * GET /jobs query params — jobs-api `public/routes/jobs.ts` header + its
 * `params.get(...)` reads (2026-10-29); `job_id` reroutes to the job-detail
 * handler (`public/router.ts`, 2026-10-30). Mirror: optionality only (D25).
 *
 * Not mirrored, on purpose: `include=salary_average` / `salary_average=1`
 * (they reroute the call to the salary-average handler, which is its own
 * endpoint here), `fields=lite`, `skip_count` and `_internal_swr`
 * (internal plumbing).
 */
export const zJobsSearchQueryParams = zWorklittleJobFilters.extend({
    job_id: z.string().min(1).describe(
        "One job in full instead of a search: an `id` from an earlier " +
            "search. The answer is that job at the top level, with its " +
            "full description text; other filters are ignored.",
    ).optional(),
    near_lat: z.number().describe(
        "Latitude for a distance search; send with near_lng. Results are " +
            "ordered by distance unless `sort` says otherwise.",
    ).min(-90).max(90).optional(),
    near_lng: z.number().describe(
        "Longitude for a distance search; send with near_lat.",
    ).min(-180).max(180).optional(),
    radius_km: z.number().describe(
        "Distance-search radius in km (1–500, default 50).",
    ).min(1).max(500).optional(),
    exclude_remote: z.boolean().describe(
        "Distance search only: true (default) leaves out remote-only jobs; " +
            "false keeps them.",
    ).optional(),
    remote: z.boolean().describe(
        "true: remote jobs only (same as workplace_type=remote). Do not " +
            "combine with near_lat/near_lng — remote jobs have no place, so " +
            "the distance search is skipped.",
    ).optional(),
    state: z.string().describe(
        "US state abbreviation, e.g. CA. Matches the job's state or a " +
            "'City, CA' location. Not used with near_lat/near_lng.",
    ).optional(),
    sort: z.enum(["newest", "oldest", "relevance", "distance", "salary"])
        .describe(
            "Distance search: distance (default), newest or salary. A " +
                "single included `company`: newest (default), oldest, or " +
                "relevance (needs q or title). Ignored otherwise; the " +
                "default order is newest first.",
        ).optional(),
    include_total: z.boolean().describe(
        "true: `meta.total` counts every match, not just this page. The " +
            "count stops at 5,000; `meta.total_is_minimum: true` means " +
            "there are at least that many. First " +
            "page of a `title` search only; not with near_* or company.",
    ).optional(),
    limit: z.number().int().describe(
        "Results per page (1–50, default 20).",
    ).min(1).max(50).optional(),
    cursor: z.string().describe(
        "Opaque `meta.next_cursor` from the previous page. Send the same " +
            "filters with it.",
    ).min(1).optional(),
});
