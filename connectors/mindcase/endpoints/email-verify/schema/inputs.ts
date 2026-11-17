import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `email/verify` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/email/verify). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zEmailVerifyBody = z.object({
    emails: z.array(z.string()).max(5000)
        .describe(
            "Email addresses to check, one per item (e.g. media@stripe.com). Up to 5,000 per request; split longer lists across requests. Each address returns one row; an address that is not a well-formed email is refused before the request runs.",
        ),
}).strict();
