import { z } from "zod";
import { zCountry, zDate, zKeyword } from "../../../../schema/common.ts";

export const zSerpOverviewQueryParams = z.object({
    keyword: zKeyword,
    country: zCountry,
    date: zDate.optional(),
    top_positions: z.number().int().min(1).max(100).describe(
        "How many top positions to return (1-100; one billed row per " +
            "position).",
    ).optional(),
}).strict();
