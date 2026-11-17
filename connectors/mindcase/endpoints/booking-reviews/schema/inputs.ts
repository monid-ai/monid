import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `booking/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/booking/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zBookingReviewsBody = z.object({
    urls: z.string()
        .describe("Booking.com hotel URL to scrape reviews from."),
    maxReviewsPerHotel: z.number().int()
        .describe("Number of reviews to return. Use 0 for all.")
        .optional(),
    sortBy: z.enum([
        "f_relevance",
        "f_recent_desc",
        "f_recent_asc",
        "f_score_desc",
        "f_score_asc",
    ])
        .describe("Sort order for reviews.")
        .optional(),
    cutoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Stop loading older/newer reviews past this date. Only applies when Sort By = Newest first OR Oldest first. Format YYYY-MM-DD.",
        )
        .optional(),
    reviewScores: z.array(
        z.enum([
            "review_adj_superb",
            "review_adj_good",
            "review_adj_average_passable",
            "review_adj_poor",
        ]),
    )
        .describe(
            "Filter to reviews in these score bands. Leave empty for all.",
        )
        .optional(),
}).strict();
