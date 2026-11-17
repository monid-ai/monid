import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/marketplace` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/marketplace). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookMarketplaceBody = z.object({
    url: z.string()
        .describe(
            "A Facebook Marketplace category or search URL. Examples: https://www.facebook.com/marketplace/nyc/electronics or https://www.facebook.com/marketplace/london/search/?query=bicycle.",
        ),
    maxResults: z.number().int()
        .describe("Number of listings to return in total. Use 0 for all.")
        .optional(),
}).strict();
