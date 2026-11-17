import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `similarweb/similar-sites` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/similarweb/similar-sites). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSimilarwebSimilarSitesBody = z.object({
    domains: z.array(z.string())
        .describe(
            "One or more domains (example.com, or a full URL; www and paths are ignored). Each returns up to 10 similar sites.",
        ),
    maxResults: z.number().int().max(10)
        .describe(
            "How many similar sites to return per domain, best match first. Similarweb lists up to 10 per domain; defaults to 10 (all of them).",
        )
        .optional(),
}).strict();
