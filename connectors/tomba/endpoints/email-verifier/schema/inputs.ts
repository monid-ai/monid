import { z } from "zod";
import { zEmail } from "../../../schema/common.ts";

/** GET /email-verifier query — the vendor mirror (docs.tomba.io
 *  api/verifier#email-verifier, 2026-11-11). `webhook_url` is left out
 *  (design D5). */
export const zEmailVerifierQueryParams = z.object({
    email: zEmail.describe("The email address to verify.").optional(),
    enrich_mobile: z.boolean().describe(
        "Set to true to also get the person's phone numbers in " +
            "`phone_data`, when Tomba has the address on record. Each phone " +
            "number returned costs 5 extra credits.",
    ).optional(),
}).strict();
