import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `news/mentions` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/news/mentions). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zNewsMentionsBody = z.object({
    query: z.array(z.string())
        .describe(
            "One or more keywords or phrases to find in article headlines, combined with AND.",
        ),
    language: z.string()
        .describe(
            "Restrict results to articles in this two-letter language code, e.g. en or de.",
        )
        .optional(),
    maxResults: z.number().int().max(100)
        .describe(
            "How many articles to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
}).strict();
