import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `trustpilot/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/trustpilot/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTrustpilotReviewsBody = z.object({
    companies: z.array(z.string())
        .describe(
            "Company domains (nordvpn.com) or Trustpilot review URLs. One per line.",
        ),
    maxResults: z.number().int()
        .describe(
            "Stop after this many reviews in total. Each review costs one row, so this caps the bill as well as the output. 0 or omitted means every review available.",
        )
        .optional(),
    stars: z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe("Only reviews with these star ratings. Leave empty for all.")
        .optional(),
    languages: z.array(z.string())
        .describe(
            "Only reviews in these languages, as ISO codes (en, de, fr). Leave empty for all.",
        )
        .optional(),
    verifiedOnly: z.boolean()
        .describe("Only reviews Trustpilot has verified.")
        .optional(),
    withRepliesOnly: z.boolean()
        .describe("Only reviews the company has replied to.")
        .optional(),
    sortBy: z.enum(["recency", "relevance"])
        .describe(
            "Newest first, or Trustpilot's relevance order (which only covers the first 200 reviews per company).",
        )
        .optional(),
    reviewsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only reviews published on or after this date (YYYY-MM-DD). Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
