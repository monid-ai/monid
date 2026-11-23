import { z } from "zod";

export const zV3MarketCryptoTrendingContractsQueryParams = z.object({
    from: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds.",
    ),
    to: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Default now.",
    ).optional(),
    minMentions: z.number().int().min(1).describe(
        "Default 5. Posts, not accounts.",
    ).optional(),
    limit: z.number().int().min(1).max(200).describe(
        "Default 50, maximum 200.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
