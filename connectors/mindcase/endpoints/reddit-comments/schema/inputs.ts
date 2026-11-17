import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `reddit/comments` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/reddit/comments). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zRedditCommentsBody = z.object({
    inputs: z.string()
        .describe(
            "Reddit post URL to fetch comments from (e.g. https://www.reddit.com/r/technology/comments/1ub7r1y/...).",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of comments to return. Use 0 for all.")
        .optional(),
    includeComments: z.boolean()
        .describe(
            "Fetch the comment tree for each post. On by default for this agent.",
        )
        .optional(),
    subreddit: z.array(z.string())
        .describe(
            "Communities to search inside: a name (technology), r/name or the full URL. Reddit has no global comment index, so at least one is required.",
        )
        .optional(),
    keyword: z.string()
        .describe(
            "Text that must actually appear in the comment. Unlike the post search, every row returned genuinely contains it.",
        )
        .optional(),
}).strict();
