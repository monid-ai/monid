import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "period": z.union([z.enum(["7d", "30d", "90d", "all"]), z.null()]).describe(
        "Time period for the trend. Use '7d' for last week, '30d' for last month, '90d' for last quarter, 'all' for all history, or null for '30d'.",
    ),
    "cursor": z.union([
        z.strictObject({
            "offset": z.number().int().min(0).max(9007199254740991),
            "revision": z.number().int().min(-9007199254740991).max(
                9007199254740991,
            ),
        }),
        z.null(),
    ]).optional(),
    "limit": z.union([z.number().int().min(1).max(60), z.null()]).optional(),
});
