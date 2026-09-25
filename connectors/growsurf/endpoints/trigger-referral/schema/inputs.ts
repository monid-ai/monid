import { z } from "zod";

/**
 * `POST /campaign/{id}/participant/{participantIdOrEmail}/ref` body.
 *
 * GrowSurf documents the body as OPTIONAL, with `{}` meaning "award now".
 * The engine validates a declared body schema and an absent body is not an
 * empty object to it, so the caller sends `{}` — same wire request, stated
 * rather than implied.
 */
const MAX_DELAY_DAYS = 90;

export const zTriggerReferralBody = z.object({
    delayInDays: z.number().int().min(1).max(MAX_DELAY_DAYS).optional()
        .describe(
            "Whole days to hold the credit before awarding it, 1-90 — " +
                "set this to your own refund window so a refunded sale " +
                "never credits a referrer. Omit to award immediately. A " +
                "held credit is awarded automatically once the delay " +
                "elapses, and can be cancelled before then with DELETE on " +
                "this same path.",
        ),
});
