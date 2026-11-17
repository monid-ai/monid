import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `web/extract` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/web/extract). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zWebExtractBody = z.object({
    urls: z.array(z.string())
        .describe(
            "Pages to extract from, up to 100 per request. One row per page.",
        ),
    fields: z.array(z.string())
        .describe(
            "Names of the values to pull from each page, like price, title or author.",
        )
        .optional(),
    schema: z.string()
        .describe(
            "A JSON Schema object (type object with properties) describing the data to extract. Every property needs a type, and every array needs items.",
        )
        .optional(),
    prompt: z.string()
        .describe(
            "Optional guidance in plain words, like: prices in USD, monthly billing only.",
        )
        .optional(),
}).strict();
