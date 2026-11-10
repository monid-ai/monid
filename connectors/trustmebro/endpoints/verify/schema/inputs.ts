import { z } from "zod";

/**
 * POST /v1/verify body. Mirrors TMB's `VerifyRequest`
 * (backend/apiwallet_routes.py): one required string, max 600 characters.
 * TMB trims the claim and answers 400 "Empty claim." for blank text, so a
 * floor of 1 and a non-whitespace check are added here to fail before the wire.
 */
export const zTrustmebroVerifyBody = z.object({
    claim: z.string().min(1).max(600).regex(/\S/).describe(
        "The claim to check, as one plain-language statement (1 to 600 " +
            "characters), for example 'Humans use only 10% of their brain.' " +
            "Do not send confidential or personal text: a check can " +
            "publish a public receipt.",
    ),
});
