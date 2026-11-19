import { z } from "zod";
import { jobFilterShape } from "../../../schema/common.ts";

/** POST /v2/jobs/estimate body — every Search Jobs filter plus `limit`. */
export const zJobsEstimateBody = z.strictObject({
    ...jobFilterShape,
    limit: z.number().int().min(0).describe(
        "0 (recommended) returns the total number of matching jobs. Any " +
            "other value returns what a search page of that size would " +
            "cost: the smaller of limit and the match count.",
    ).optional(),
});
