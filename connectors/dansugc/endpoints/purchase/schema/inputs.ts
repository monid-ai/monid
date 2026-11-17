import { z } from "zod";
import { zClipId } from "../../../schema/common.ts";

/** POST /broll/purchase body — the vendor mirror
 *  (dansugc.com/docs#tag/b-roll/POST/broll/purchase, 2026-10-20). */
export const zPurchaseBody = z.object({
    video_ids: z.array(zClipId).min(1).max(50),
    /** The confirmed total in hundredths of a credit (1100 = 11 credits).
     *  Absent or stale → 409 with `expectedTotalCents`, nothing charged. */
    expected_total_cents: z.number().int().min(0).optional(),
    /** The caller's own end customer, for its billing reconciliation. */
    customer_email: z.string().email().optional(),
    /** One per intended purchase, reused only to retry it: a repeat with
     *  the same key and body replays the first successful answer instead
     *  of charging again. Non-2xx answers (the 409 confirm) don't use it up. */
    idempotency_key: z.string().regex(/^[\x21-\x7e]{1,255}$/).optional(),
}).strict();
