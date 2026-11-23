import { z } from "zod";

export const zV2DataKeywordMentionsQueryParams = z.object({
    keywords: z.string().min(1).regex(/^[^,]*(,[^,]*){0,4}$/).describe(
        "Up to 5 keywords to search for, separated by commas " +
            "(optional if accountName provided)",
    ).optional(),
    accountName: z.string().min(1).describe(
        "Account username to filter by (optional if keywords " +
            "provided)",
    ).optional(),
    timeWindow: z.string().regex(/^\d+(m|h|d)$/).describe(
        'Time window, e.g. "30m", "1h", "4h", "24h", "7d", "30d". ' +
            'from/to take priority when set. Defaults to "7d".',
    ).optional(),
    from: z.number().int().nonnegative().describe(
        "Start date (unix timestamp)",
    ).optional(),
    to: z.number().int().nonnegative().describe(
        "End date (unix timestamp)",
    ).optional(),
    limit: z.number().int().min(1).max(30).describe(
        "Number of results to return (max 30). Defaults to 20.",
    ).optional(),
    searchType: z.enum(["and", "or"]).describe(
        "Type of search (and, or)",
    ).optional(),
    cursor: z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
        .describe(
            "Cursor for pagination (millisecond timestamp from a previous " +
                "response's `metadata.cursor`)",
        ).optional(),
    reposts: z.boolean().describe(
        "Include reposts. Omit to use the server default.",
    ).optional(),
}).strict();
