import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zBody = z.strictObject({
    "status": z.union([
        z.enum(["open", "snoozed", "dismissed", "resolved"]),
        z.null(),
    ]),
    "limit": z.union([z.number().int().min(1).max(30), z.null()]),
    "before": z.union([
        z.strictObject({
            "timestamp": z.iso.datetime(),
            "id": z.uuid(),
        }),
        z.null(),
    ]),
});
