import { z } from "zod";

export const zV3PeopleAccountsQueryParams = z.object({
    metric: z.enum(["standing", "alphaScore", "hitRate", "avgReturn"]).describe(
        "Default `standing`. Which axis an account is ranked on. " +
            "`standing` is influence; `alphaScore`, `hitRate` and " +
            "`avgReturn` are its record as a caller, the same numbers as " +
            "its `track`.",
    ).optional(),
    order: z.enum(["desc", "asc"]).describe(
        "`desc` (default) or `asc`.",
    ).optional(),
    limit: z.number().int().min(1).max(200).describe(
        "Default 50, maximum 200.",
    ).optional(),
    cursor: z.string().min(1).describe(
        "`nextCursor` from the previous response.",
    ).optional(),
}).strict();
