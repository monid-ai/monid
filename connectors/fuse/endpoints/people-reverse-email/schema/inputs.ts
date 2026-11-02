import { z } from "zod";

/**
 * `POST /data/people/reverse-email` body — the mirror of Fuse's published
 * request (design D25), STRICT like the API. The address is a plain bounded
 * string: Fuse's own email check is the gate, and a stricter pattern here
 * would refuse addresses Fuse accepts.
 */
export const zReverseEmailBody = z.strictObject({
    email: z.string().min(1).max(320).describe(
        "The address to find the owner of, e.g. `jane@stripe.com`: a work " +
            "or a personal address.",
    ),
});
