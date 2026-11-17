import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `aliexpress/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/aliexpress/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAliexpressReviewsBody = z.object({
    productUrls: z.array(z.string())
        .describe("One or more product urls. One request reads them all."),
    maxReviewsPerProduct: z.number().int().min(0).max(50000)
        .describe(
            "Most reviews to return from each product. Defaults to 100; use 0 for all.",
        )
        .optional(),
    reviewFilter: z.enum([
        "all",
        "with_photos",
        "with_follow_up",
        "same_country",
    ])
        .describe("Review Filter to use. All reviews by default.")
        .optional(),
}).strict();
