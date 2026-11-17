import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `web/backlinks` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/web/backlinks). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWebBacklinksBody = z.object({
    domains: z.array(z.string())
        .describe("One or more domains. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many backlinks to return in total. Defaults to 20; use 0 for all.",
        )
        .optional(),
}).strict();
