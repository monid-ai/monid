import { z } from "zod";

export const zV2DataTrendingNarrativesQueryParams = z.object({
    timeFrame: z.enum(["day", "week"]).describe(
        'Time frame for analysis (day, week). Defaults to "day".',
    ).optional(),
    maxNarratives: z.number().int().min(1).max(20).describe(
        "Maximum number of narratives to return (1-20). Defaults to " +
            "7.",
    ).optional(),
    maxTweetsPerNarrative: z.number().int().min(1).max(20).describe(
        "Maximum number of tweets per narrative (1-20). Defaults to " +
            "5.",
    ).optional(),
}).strict();
