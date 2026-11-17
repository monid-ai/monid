import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `yelp/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/yelp/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zYelpReviewsBody = z.object({
    urls: z.string()
        .describe(
            "Yelp business page URL to scrape reviews from (e.g. https://www.yelp.com/biz/katzs-delicatessen-new-york).",
        ),
    maxReviews: z.number().int()
        .describe(
            "Number of reviews to return in total. Use 0 for all available reviews.",
        )
        .optional(),
}).strict();
