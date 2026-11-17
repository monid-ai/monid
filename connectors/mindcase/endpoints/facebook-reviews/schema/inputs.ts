import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookReviewsBody = z.object({
    urls: z.string()
        .describe(
            "Facebook page URL to scrape reviews from (e.g. https://www.facebook.com/disneylandparis or its /reviews tab).",
        ),
    maxResults: z.number().int()
        .describe("Number of reviews to return in total. Use 0 for all.")
        .optional(),
}).strict();
