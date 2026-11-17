import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/comments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/comments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookCommentsBody = z.object({
    post_url: z.string()
        .describe(
            "A Facebook post, reel, or photo permalink to scrape comments from.",
        ),
    maxResults: z.number().int()
        .describe("Number of comments to return. Use 0 for all.")
        .optional(),
    includeNestedComments: z.boolean()
        .describe(
            "On: also pull replies under each comment (returned as their own rows). Off: top-level comments only.",
        )
        .optional(),
    viewOption: z.enum([
        "RANKED_UNFILTERED",
        "RANKED_THREADED",
        "RECENT_ACTIVITY",
    ])
        .describe("How Facebook orders the comments it returns.")
        .optional(),
}).strict();
