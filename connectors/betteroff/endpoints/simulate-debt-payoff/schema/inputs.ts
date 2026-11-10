import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "strategy": z.enum(["avalanche", "snowball"]).describe(
        "avalanche = highest APR first (minimizes interest); snowball = smallest balance first (faster early wins).",
    ),
    "extraMonthly": z.number().min(0).max(1000000).describe(
        "Extra amount paid toward debts each month beyond the minimums, in the user's base currency. Use 0 for none.",
    ),
});
