import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `etsy/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/etsy/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zEtsyListingsBody = z.object({
    queries: z.array(z.string())
        .describe("One or more search keywords. One request reads them all.")
        .optional(),
    searchUrls: z.array(z.string())
        .describe("One or more search urls. One request reads them all.")
        .optional(),
    shopUrls: z.array(z.string())
        .describe("One or more shop urls. One request reads them all.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many listings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
