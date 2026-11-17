import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `amazon/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/amazon/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zAmazonReviewsBody = z.object({
    urls: z.string()
        .describe(
            "An Amazon product URL or bare ASIN from any marketplace. A full URL uses its own marketplace; a bare ASIN uses the Marketplace setting.",
        ),
    marketplace: z.enum([
        "com",
        "in",
        "de",
        "co.uk",
        "fr",
        "it",
        "es",
        "ca",
        "com.au",
        "co.jp",
        "com.mx",
        "com.br",
    ])
        .describe(
            "Which Amazon site to pull reviews from. Applies to bare ASINs only; full URLs always use their own marketplace.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "Number of reviews to return in total. Amazon caps at 100 per product; use 0 for the maximum (100).",
        )
        .optional(),
}).strict();
