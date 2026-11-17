import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `capterra/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/capterra/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zCapterraReviewsBody = z.object({
    url: z.string()
        .describe("URL."),
    maxResults: z.number().int()
        .describe(
            "How many reviews to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum([
        "MOST_RECENT",
        "HIGHEST_COMPLETENESS_SCORE",
        "HIGHEST_RATED",
        "LOWEST_RATED",
    ])
        .describe("Sort By to use. Most recent by default.")
        .optional(),
    starRatings: z.array(z.enum(["5", "4", "3", "2", "1"]))
        .describe(
            "Only return reviews with these star ratings. Leave empty for all ratings.",
        )
        .optional(),
}).strict();
