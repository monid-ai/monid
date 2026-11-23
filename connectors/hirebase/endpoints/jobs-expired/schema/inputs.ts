import { z } from "zod";

/** GET /v2/jobs/expired-jobs query. */
export const zJobsExpiredQueryParams = z.strictObject({
    since: z.string().min(1).describe(
        "List jobs that closed on or after this date or datetime " +
            "(YYYY-MM-DD or ISO-8601, UTC). Must be within the last 14 days.",
    ),
    page: z.number().int().min(1).describe(
        "Page number (default 1). Walk pages in order.",
    ).optional(),
    limit: z.number().int().min(1).max(1000).describe(
        "Rows per page, 1-1000 (default 100).",
    ).optional(),
});
