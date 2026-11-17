import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `address/verify` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/address/verify). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAddressVerifyBody = z.object({
    addresses: z.array(z.string())
        .describe("One or more addresses. One request reads them all."),
    country: z.string()
        .describe(
            "Only match addresses in this country, e.g. India. Leave blank to search every country. Accepts one of 249 values; list them with GET https://api.mindcase.co/v1/data/address/verify?expand=options.",
        )
        .optional(),
}).strict();
