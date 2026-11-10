import { z } from "zod";

// Published BetterOff v4 API contract, retrieved 2026-10-25.
export const zOutput = z.looseObject({
    "ok": z.literal(true),
    "requestId": z.string().optional(),
    "schemaVersion": z.literal("4"),
    "receiptId": z.uuid(),
    "status": z.literal("submitted"),
    "duplicate": z.boolean(),
});
