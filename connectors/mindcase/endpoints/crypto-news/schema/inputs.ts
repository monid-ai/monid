import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `crypto/news` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/crypto/news). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCryptoNewsBody = z.object({
    query: z.string()
        .describe(
            "Keyword or phrase to search crypto news for, e.g. bitcoin ETF.",
        ),
    maxResults: z.number().int().max(100)
        .describe(
            "How many articles to return in total. Defaults to 20; use 0 for all.",
        )
        .optional(),
}).strict();
