import { z } from "zod";
import { jobFilterShape } from "../../../schema/common.ts";

/** POST /v2/jobs/insights body — the Search Jobs filters (no paging or
 *  sorting) plus one insights-only field. */
export const zJobsInsightsBody = z.strictObject({
    ...jobFilterShape,
    top_companies_limit: z.number().int().min(1).max(50).describe(
        "How many employers to return in top_companies (default 10).",
    ).optional(),
});
