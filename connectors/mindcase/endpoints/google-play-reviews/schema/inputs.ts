import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google/play/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google/play/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGooglePlayReviewsBody = z.object({
    inputs: z.string()
        .describe(
            "A Google Play app URL or package ID (e.g. org.telegram.messenger) to scrape reviews from.",
        ),
    maxResults: z.number().int()
        .describe("Number of reviews to return. Use 0 for all.")
        .optional(),
    country: z.string()
        .describe(
            "Country's Google Play store to pull reviews from. Accepts one of 53 values; list them with GET https://api.mindcase.co/v1/data/google/play/reviews?expand=options.",
        )
        .optional(),
    language: z.string()
        .describe(
            "Language to pull reviews in. Accepts one of 54 values; list them with GET https://api.mindcase.co/v1/data/google/play/reviews?expand=options.",
        )
        .optional(),
    sortBy: z.enum(["NEWEST", "RATING", "HELPFULNESS"])
        .describe("Sort order for reviews.")
        .optional(),
}).strict();
