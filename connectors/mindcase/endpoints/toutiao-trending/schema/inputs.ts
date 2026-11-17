import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `toutiao/trending` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/toutiao/trending). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zToutiaoTrendingBody = z.object({
    maxResults: z.number().int().max(100)
        .describe(
            "How many topics to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
