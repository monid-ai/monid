import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `g2/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/g2/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zG2ReviewsBody = z.object({
    products: z.array(z.string())
        .describe(
            "G2 product review URLs (https://www.g2.com/products/notion/reviews) or bare product slugs (notion). One per line.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many reviews to return per product. Defaults to 50; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["newest", "highest_rated", "lowest_rated", "most_helpful"])
        .describe(
            "The order G2 lists the reviews in before Max Results is applied. Newest first by default.",
        )
        .optional(),
    stars: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe(
            "Only reviews in these G2 star buckets; a bucket holds its half star too (4 stars covers 3.5 and 4). Pick one value, or a run that starts at 1 or ends at 5 (4 and 5 means 4 stars and up). Leave empty for all.",
        )
        .optional(),
    reviewsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only reviews published on or after this date (YYYY-MM-DD), up to 10 years back. Reviews then come newest first, so Sort By must be left at Newest first. Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
