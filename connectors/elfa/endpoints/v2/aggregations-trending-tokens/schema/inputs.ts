import { z } from "zod";

export const zV2AggregationsTrendingTokensQueryParams = z.object({
    timeWindow: z.string().regex(/^\d+(m|h|d)$/).describe(
        'Time window for trending analysis (e.g., "30m", "1h", "4h", ' +
            '"24h", "7d", "30d"). Defaults to "7d".',
    ).optional(),
    from: z.number().int().nonnegative().describe(
        "Start date (unix timestamp)",
    ).optional(),
    to: z.number().int().nonnegative().describe(
        "End date (unix timestamp)",
    ).optional(),
    page: z.number().int().min(1).max(100).describe(
        "Page number for pagination. Defaults to 1.",
    ).optional(),
    pageSize: z.number().int().min(1).max(100).describe(
        "Number of items per page. Defaults to 50.",
    ).optional(),
    minMentions: z.number().int().min(1).max(100).describe(
        "Minimum number of mentions required. Defaults to 5.",
    ).optional(),
}).strict();
