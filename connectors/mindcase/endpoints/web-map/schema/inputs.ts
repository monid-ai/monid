import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `web/map` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/web/map). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWebMapBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Sites to map, like https://example.com. Each site is one row and one charge.",
        ),
    maxUrls: z.number().int().min(1).max(5000)
        .describe(
            "How many URLs to return for each site. Defaults to 5,000, the most a site can return.",
        )
        .optional(),
}).strict();
