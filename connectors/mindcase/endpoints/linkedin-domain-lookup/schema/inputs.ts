import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/domain-lookup` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/domain-lookup). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinDomainLookupBody = z.object({
    domains: z.array(z.string())
        .describe(
            "Company website domains to find LinkedIn pages for. One per line. A bare host (stripe.com) or a full URL both work.",
        ),
    maxResults: z.number().int().max(10000)
        .describe(
            "Stop after this many LinkedIn URLs have been found. Domains are looked up until the cap is met, so a domain that does not resolve does not use it up. Leave empty to look up every domain you send.",
        )
        .optional(),
}).strict();
