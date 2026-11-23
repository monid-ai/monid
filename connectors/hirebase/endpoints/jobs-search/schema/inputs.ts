import { z } from "zod";
import { jobFilterShape, zFlag, zSortOrder } from "../../../schema/common.ts";

/** POST /v2/jobs/search body — every field optional, unknown fields 422. */
export const zJobsSearchBody = z.strictObject({
    ...jobFilterShape,
    return_raw_description: zFlag.describe(
        "true to add description_raw to each job: the full original HTML " +
            "posting (often 5,000+ characters). Without it each job " +
            "carries only the cleaned, shortened description.",
    ).optional(),
    sort_by: z.enum([
        "relevance",
        "date_posted",
        "first_ingested",
        "salary",
        "yoe",
    ]).describe("Sort field (default relevance).").optional(),
    sort_order: zSortOrder.describe("Sort direction (default desc).")
        .optional(),
    page: z.number().int().min(1).describe("Page number (default 1).")
        .optional(),
    limit: z.number().int().min(1).describe(
        "Jobs per page, 1-100. Each job returned is billed, so this is " +
            "the most the call can cost.",
    ).optional(),
});
