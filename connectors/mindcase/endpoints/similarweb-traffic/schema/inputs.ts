import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `similarweb/traffic` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/similarweb/traffic). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSimilarwebTrafficBody = z.object({
    domains: z.array(z.string())
        .describe(
            "Domains or website URLs to look up. Hostnames are normalised, lowercased and deduplicated. Up to 200 per request.",
        ),
    maxResults: z.number().int().max(200)
        .describe(
            "Stop after this many domains have been looked up. Each domain costs one row, so this caps the bill as well as the output. 0 or omitted means every domain you sent.",
        )
        .optional(),
}).strict();
