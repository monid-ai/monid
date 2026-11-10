import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "groupBy": z.enum(["category", "merchant"]).optional(),
    "startDate": z.union([z.iso.date(), z.null()]).describe(
        "Start date (ISO). Use null for start of current month.",
    ),
    "endDate": z.union([z.iso.date(), z.null()]).describe(
        "End date (ISO). Use null for today.",
    ),
    "comparison": z.union([
        z.strictObject({
            "startDate": z.iso.date(),
            "endDate": z.iso.date(),
        }),
        z.null(),
    ]),
});
