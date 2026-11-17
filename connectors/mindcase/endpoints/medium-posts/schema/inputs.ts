import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `medium/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/medium/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zMediumPostsBody = z.object({
    tags: z.array(z.string())
        .describe(
            "Medium topic tags: the labels writers put on their posts, which are open-ended, so any tag that exists on Medium works. A tag is the part after medium.com/tag/, for example artificial-intelligence or startup. You can also type the words ('Data Science') or paste the tag link (medium.com/tag/data-science); both become the tag. Popular tags: artificial-intelligence, programming, startup, marketing, data-science, productivity, crypto, design. A tag that does not exist on Medium returns an error; use Keyword search for free words.",
        )
        .optional(),
    queries: z.array(z.string())
        .describe(
            "Words to search Medium posts for, like a search box, for example retrieval augmented generation or remote work. One request reads them all.",
        )
        .optional(),
    tagSort: z.enum([
        "newest",
        "trending",
        "top-week",
        "top-month",
        "top-year",
        "top-all-time",
        "all-top",
    ])
        .describe(
            "Which list of the tag's posts to read, for example newest or top-month. Newest first by default, the only order that reaches the whole archive; the top and trending lists hold about 100 posts each.",
        )
        .optional(),
    publishedAfter: z.string()
        .describe(
            "Only posts published on or after this date, for example 2025-01-01, or a relative time such as 30 days or 6 months.",
        )
        .optional(),
    publishedBefore: z.string()
        .describe(
            "Only posts published on or before this date, for example 2025-06-30, or a relative time such as 7 days.",
        )
        .optional(),
    minClaps: z.number().int().min(0).max(100000000)
        .describe(
            "Only posts with at least this many claps (Medium's likes), for example 100. 0 by default, which keeps every post.",
        )
        .optional(),
    language: z.string()
        .describe(
            "Only posts in this language, as a two-letter code, for example en or es. Leave empty for all languages.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many posts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
