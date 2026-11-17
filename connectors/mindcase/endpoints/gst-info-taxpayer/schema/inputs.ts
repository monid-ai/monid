import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `gst-info/taxpayer` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/gst-info/taxpayer). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGstInfoTaxpayerBody = z.object({
    gstins: z.array(z.string())
        .describe(
            "One or more 15-character GSTINs. Each is checksum-validated before anything is fetched, so a typo costs nothing. Each GSTIN returns one row.",
        ),
    maxResults: z.number().int()
        .describe(
            "Stop after this many have been looked up. Each one costs a row, so this caps the bill as well as the output. 0 or omitted means every id you sent.",
        )
        .optional(),
}).strict();
