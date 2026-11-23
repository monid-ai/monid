import { z } from "zod";

export const zV3EventsStorylinesQueryParams = z.object({
    q: z.string().max(500).regex(/\S/).describe(
        "Topic to search for, up to 500 characters. Ranks by " +
            "relevance.",
    ).optional(),
    from: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Required unless `storylineIds` or `q` is sent.",
    ).optional(),
    to: z.number().int().nonnegative().max(4_102_444_800).describe(
        "Unix seconds. Default now.",
    ).optional(),
    storylineIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30. An id we do not hold is skipped.",
    ).optional(),
    entityIds: z.array(z.guid()).min(1).max(30).describe(
        "Up to 30 family or entity UUIDs. A storyline matches if it " +
            "involves any of them.",
    ).optional(),
    status: z.enum(["open", "dormant", "any"]).describe(
        "Default `open`, or `any` with `q`. `any` reads every status.",
    ).optional(),
    relation: z.array(
        z.enum([
            "origin",
            "update",
            "confirmation",
            "contradiction",
            "mitigation",
            "consequence",
            "reaction",
            "context",
        ]),
    ).min(1).describe(
        "One or more. Matches storylines carrying any of them.",
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
