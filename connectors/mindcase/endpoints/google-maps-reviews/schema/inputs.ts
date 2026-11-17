import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-maps/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-maps/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleMapsReviewsBody = z.object({
    urls: z.string()
        .describe("Google Maps place URL to scrape reviews from."),
    maxReviews: z.number().int()
        .describe("Number of reviews to return. Use 0 for all.")
        .optional(),
    sortBy: z.enum([
        "newest",
        "mostRelevant",
        "highestRanking",
        "lowestRanking",
    ])
        .describe("Sort order for reviews.")
        .optional(),
}).strict();
