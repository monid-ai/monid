import { z } from "zod";

export const zV3MarketEquityMindshareQueryParams = z.object({
    period: z.enum(["1h", "4h", "24h", "7d"]).describe(
        "Default `4h`.",
    ).optional(),
    to: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Default now: the board as of that moment.",
    ).optional(),
    limit: z.number().int().min(1).max(200).describe(
        "Default 50, maximum 200.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
