import { z } from "zod";

export const zV2DataTokenNewsQueryParams = z.object({
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
    page: z.number().int().min(1).max(100).describe(
        "Page number for pagination. Defaults to 1.",
    ).optional(),
    pageSize: z.number().int().min(1).max(100).describe(
        "Number of items per page. Defaults to 20.",
    ).optional(),
    coinIds: z.string().min(1).describe(
        "CoinGecko Coin IDs to filter by, comma-separated",
    ).optional(),
    reposts: z.boolean().describe(
        "Include reposts. Omit to use the server default.",
    ).optional(),
}).strict();
