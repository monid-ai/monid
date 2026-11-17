import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `twitter/articles` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/twitter/articles). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTwitterArticlesBody = z.object({
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all."),
}).strict();
