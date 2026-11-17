import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tripadvisor/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tripadvisor/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTripadvisorReviewsBody = z.object({
    urls: z.string()
        .describe("TripAdvisor URL of the place to scrape reviews from."),
    maxResults: z.number().int()
        .describe("Number of reviews to return. Use 0 for all.")
        .optional(),
    lastReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Stop loading reviews older than this date. Format YYYY-MM-DD.",
        )
        .optional(),
    reviewRatings: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe("Filter to reviews with these ratings. Leave empty for all.")
        .optional(),
    reviewsLanguages: z.array(z.string())
        .describe(
            "Filter to reviews in these languages. Leave empty for all. Accepts one of 183 values; list them with GET https://api.mindcase.co/v1/data/tripadvisor/reviews?expand=options.",
        )
        .optional(),
    includeReviewerInfo: z.boolean()
        .describe("Pull each reviewer's name, profile pic, location, etc.")
        .optional(),
}).strict();
