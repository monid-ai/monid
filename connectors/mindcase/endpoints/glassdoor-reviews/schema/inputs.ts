import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `glassdoor/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/glassdoor/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGlassdoorReviewsBody = z.object({
    urls: z.array(z.string())
        .describe("One or more urls. One request reads them all."),
    maxResults: z.number().int()
        .describe(
            "How many reviews to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["DATE", "RATING"])
        .describe("Sort By to use. DATE by default.")
        .optional(),
}).strict();
