import { z } from "zod";

/**
 * `POST /data/people/reverse-phone` body — the mirror of Fuse's published
 * request (design D25), STRICT like the API. The number is a plain bounded
 * string: Fuse reads it as E.164 itself and answers 422
 * `PHONE_NUMBER_INVALID` for one that reads as no number.
 */
export const zReversePhoneBody = z.strictObject({
    phone: z.string().min(1).max(40).describe(
        "The number to find the owner of, best with its country code, e.g. " +
            "`+14155550123`; spaces, dashes and brackets are fine, and a " +
            "number without a country code is read as a US number.",
    ),
});
