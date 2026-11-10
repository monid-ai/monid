import { z } from "zod";

/**
 * `POST /data/emails/verify` body — the mirror of Fuse's published request
 * (design D25), STRICT like the API. The address is a plain bounded string:
 * Fuse's own email check is the gate, and a stricter pattern here would
 * refuse addresses Fuse accepts.
 */
export const zVerifyEmailBody = z.strictObject({
    email: z.string().min(1).max(320).describe(
        "The address to check, e.g. `jane@stripe.com`.",
    ),
});
