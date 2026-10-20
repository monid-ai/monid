import { z } from "zod";

/** `GET /jobs/compare` query parameters. */
export const zJobCompareQueryParams = z.object({
    ids: z.string().min(1).describe(
        "2 to 5 HireHouse job IDs (UUIDs), comma-separated.",
    ),
}).strict();
