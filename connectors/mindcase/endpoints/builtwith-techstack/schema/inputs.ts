import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `builtwith/techstack` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/builtwith/techstack). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBuiltwithTechstackBody = z.object({
    domains: z.array(z.string())
        .describe("One or more domains. One request reads them all."),
}).strict();
