import { z } from "zod";
import { zWorklittleJobFilters } from "../../../schema/filters.ts";

/**
 * GET /jobs/salary-average query params — jobs-api
 * `public/routes/jobSalaryAverage.ts` (2026-10-29): the shared list filters
 * (`parseJobsListFilterParams`) plus `currency`. The distance search,
 * `remote`, `state`, `sort` and paging params of GET /jobs are NOT read by
 * this route. Note `exclude_remote` defaults the OTHER way here: remote
 * jobs count unless it is true.
 */
export const zJobsSalaryAverageQueryParams = zWorklittleJobFilters.extend({
    currency: z.string().describe(
        "ISO 4217 currency to average in (default USD). Only jobs listing " +
            "pay in this currency are averaged; nothing is converted.",
    ).optional(),
    exclude_remote: z.boolean().describe(
        "true: leave remote-only jobs out of the average. Default false.",
    ).optional(),
});
