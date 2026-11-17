import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "accountId": z.union([z.uuid(), z.null()]).optional(),
    "actorType": z.enum(["agent", "user", "system", "all"]),
    "action": z.union([
        z.enum([
            "categorize_transaction",
            "update_transaction",
            "classify_recurring",
            "confirm_debt_details",
            "apply_correction",
            "undo_correction",
        ]),
        z.null(),
    ]),
    "limit": z.union([z.number().int().min(1).max(50), z.null()]),
    "before": z.union([
        z.strictObject({
            "timestamp": z.iso.datetime(),
            "id": z.uuid(),
        }),
        z.null(),
    ]).optional(),
});
