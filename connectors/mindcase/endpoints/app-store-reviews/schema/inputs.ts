import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `app-store/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/app-store/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAppStoreReviewsBody = z.object({
    inputs: z.array(z.string())
        .describe(
            "App Store app URLs (https://apps.apple.com/us/app/.../id324684580), numeric app IDs (324684580) or bundle IDs (com.spotify.client). One or more.",
        ),
    country: z.string()
        .describe(
            "App Store country whose reviews to read, e.g. United States. Defaults to United States. Accepts one of 175 values; list them with GET https://api.mindcase.co/v1/data/app-store/reviews?expand=options.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many reviews to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
    sortBy: z.enum(["newest", "helpful", "favorable", "critical"])
        .describe("Sort By to use. Newest first by default.")
        .optional(),
    stars: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe(
            "Only return reviews with these star ratings. Leave empty for all ratings.",
        )
        .optional(),
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only reviews posted on or after this date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
