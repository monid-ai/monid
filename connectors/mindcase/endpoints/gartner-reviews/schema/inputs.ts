import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `gartner/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/gartner/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGartnerReviewsBody = z.object({
    products: z.array(z.string())
        .describe(
            "Gartner Peer Insights product URLs, short form (https://www.gartner.com/reviews/product/crowdstrike-falcon) or the long market form that ends in /product/<product>. One per line.",
        ),
    maxResults: z.number().int()
        .describe(
            "How many reviews to return per product. Defaults to 50; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["newest", "most_helpful"])
        .describe(
            "The order Gartner lists the reviews in before Max Results is applied. Newest first by default.",
        )
        .optional(),
    reviewsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only reviews published on or after this date (YYYY-MM-DD). Only used when Sort By is Newest first. Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
