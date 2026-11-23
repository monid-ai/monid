import { z } from "zod";

export const zV2DataEventSummaryQueryParams = z.object({
    keywords: z.string().min(1).regex(/^[^,]*(,[^,]*){0,4}$/).describe(
        "Keywords to search for, separated by commas",
    ),
    from: z.number().int().nonnegative().describe(
        "Start date (unix timestamp)",
    ).optional(),
    to: z.number().int().nonnegative().describe(
        "End date (unix timestamp)",
    ).optional(),
    timeWindow: z.string().regex(/^\d+(m|h|d)$/).describe(
        'Time window for mentions (e.g., "30m", "1h", "4h", "24h", ' +
            '"7d", "30d"). Defaults to "7d".',
    ).optional(),
    searchType: z.enum(["and", "or"]).describe(
        'Type of search (and, or). Defaults to "or".',
    ).optional(),
}).strict();
