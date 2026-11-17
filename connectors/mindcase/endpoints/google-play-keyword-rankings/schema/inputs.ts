import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-play/keyword-rankings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-play/keyword-rankings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGooglePlayKeywordRankingsBody = z.object({
    keywords: z.array(z.string())
        .describe(
            "Searches to run on Google Play, e.g. meditation or budget tracker. One or more.",
        ),
    country: z.string()
        .describe(
            "Google Play country to rank in, e.g. United States. Defaults to United States. Accepts one of 235 values; list them with GET https://api.mindcase.co/v1/data/google-play/keyword-rankings?expand=options.",
        )
        .optional(),
    maxResults: z.number().int().max(200)
        .describe(
            "How many ranked apps to return per keyword, from rank 1 down. Defaults to 10; use 0 for all (up to 200).",
        )
        .optional(),
}).strict();
