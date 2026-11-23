import { z } from "zod";

export const zV2DataTopMentionsQueryParams = z.object({
    ticker: z.string().min(1).describe(
        "The ticker symbol to get mentions for. Use the `$` prefix " +
            "(e.g., `$SOL`) for exact cashtag matching only. Without `$`, " +
            "results include both cashtag mentions and general token " +
            "references.",
    ),
    timeWindow: z.string().regex(/^\d+(m|h|d)$/).describe(
        'Time window for mentions (e.g., "1h", "24h", "7d"). Defaults ' +
            'to "1h".',
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
        "Number of items per page. Defaults to 10.",
    ).optional(),
    reposts: z.boolean().describe(
        "Include reposts. Omit to use the server default.",
    ).optional(),
}).strict();
