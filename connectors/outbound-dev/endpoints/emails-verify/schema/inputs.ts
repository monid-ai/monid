import { z } from "zod";

/**
 * `POST /emails/verify` body — the mirror of outbound.dev's published
 * request (design D25), STRICT like the API. The address is a plain bounded
 * string: outbound.dev's own email check is the gate, and a stricter
 * pattern here would refuse addresses it accepts.
 */
export const zVerifyEmailBody = z.strictObject({
    email: z.string().min(1).max(320).describe(
        "The address to check, e.g. `ana.costa@fernway.co`. It is checked " +
            "trimmed and in lower case.",
    ),
});
