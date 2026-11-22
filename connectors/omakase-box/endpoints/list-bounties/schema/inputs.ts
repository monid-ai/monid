import { z } from "zod";

export const zListQueryParams = z.strictObject({
    language: z.string().describe(
        "Exact repository language, case-insensitive.",
    ).optional(),
    min_reward: z.number().int().min(0).max(999999999).describe(
        "Minimum stated reward in whole USD, inclusive.",
    ).optional(),
    query: z.string().max(100).describe(
        "Literal substring in bounty title or repository; not full task text.",
    ).optional(),
    sort: z.enum(["newest", "reward"]).describe(
        "newest (default): creation descending; reward: amount descending, then newest.",
    ).optional(),
    limit: z.number().int().min(1).max(25).describe(
        "Page size, default 10, maximum 25.",
    ).optional(),
});
