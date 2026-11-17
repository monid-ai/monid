import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `web/brand-styleguide` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/web/brand-styleguide). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWebBrandStyleguideBody = z.object({
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all."),
}).strict();
