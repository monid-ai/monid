import { z } from "zod";

export const zV3EntitiesQueryParams = z.object({
    q: z.string().max(128).regex(/\S/).describe(
        "A ticker, cashtag, name, `@handle`, contract address, " +
            "CoinGecko id, FIGI or CIK.",
    ),
    entityType: z.array(
        z.enum(["token", "equity", "project", "person", "organisation"]),
    ).min(1).describe(
        "One or more. Omit to search every kind.",
    ).optional(),
    limit: z.number().int().min(1).max(200).describe(
        "Default 10, maximum 200.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
