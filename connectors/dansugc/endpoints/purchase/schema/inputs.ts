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
}).strict();
