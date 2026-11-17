import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `reddit/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/reddit/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zRedditPostsBody = z.object({
    urls: z.string()
        .describe(
            "Reddit URL to scrape posts from. Accepts a subreddit (r/technology or the full URL), a single post link, a user profile (returns that user's posts), or a listing feed. Leave it empty to search all of Reddit with Search Keyword.",
        )
        .optional(),
    keyword: z.string()
        .describe(
            "Optional. A keyword to search Reddit posts for (e.g. 'gpt5'). Use on its own, or add it alongside the URLs above; both run together.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of posts to return. Use 0 for all.")
        .optional(),
    sortBy: z.enum(["top", "new", "hot", "relevance", "comments"])
        .describe("Sort order for posts.")
        .optional(),
    timeRange: z.enum(["all", "year", "month", "week", "day", "hour"])
        .describe(
            'Time window for posts. Only applies when Sort By is "Top" (Reddit ignores it for the other sorts). (Preset windows only; no custom date ranges.).',
        )
        .optional(),
}).strict();
