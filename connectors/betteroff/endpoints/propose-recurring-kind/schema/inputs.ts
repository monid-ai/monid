import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "streamId": z.string().min(1).max(200).describe(
        "The streamId from betteroff_list_recurring.",
    ),
    "kind": z.enum(["bill", "subscription"]).describe(
        "What the payment should be marked as.",
    ),
});
