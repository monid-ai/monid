import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "startDate": z.union([z.iso.date(), z.null()]).describe(
        "Start date (ISO). Use null for 6 months ago.",
    ),
    "endDate": z.union([z.iso.date(), z.null()]).describe(
        "End date (ISO). Use null for today.",
    ),
});
