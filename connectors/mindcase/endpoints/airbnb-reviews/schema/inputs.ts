import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `airbnb/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/airbnb/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAirbnbReviewsBody = z.object({
    urls: z.string()
        .describe("Airbnb room URL to extract reviews from."),
    locale: z.string()
        .describe(
            "Localized reviews will be extracted in this locale (language and region). Accepts one of 93 values; list them with GET https://api.mindcase.co/v1/data/airbnb/reviews?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of reviews to return. Use 0 for all.")
        .optional(),
}).strict();
