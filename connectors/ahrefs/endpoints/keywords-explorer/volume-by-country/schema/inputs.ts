import { z } from "zod";
import { zKeyword } from "../../../../schema/common.ts";

export const zVolumeByCountryQueryParams = z.object({
    keyword: zKeyword,
    limit: z.number().int().min(1).max(250).describe(
        "Maximum number of countries to return (1-250; one billed row per " +
            "country).",
    ).optional(),
}).strict();
