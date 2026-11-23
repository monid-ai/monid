import { z } from "zod";

export const zV3CallsQueryParams = z.object({
    from: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Required unless `callIds` is sent.",
    ).optional(),
    to: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Default now.",
    ).optional(),
    callIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30. An id we do not hold, or older than the plan's " +
            "history, is skipped.",
    ).optional(),
    handle: z.string().max(40).regex(/[^\s@]/).describe(
        "An X username, with or without the at sign.",
    ).optional(),
    entityIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30 asset family UUIDs.",
    ).optional(),
    order: z.enum(["desc", "asc"]).describe(
        "`desc` (default) or `asc`.",
    ).optional(),
    limit: z.number().int().min(1).max(30).describe(
        "Default 10, maximum 30.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
