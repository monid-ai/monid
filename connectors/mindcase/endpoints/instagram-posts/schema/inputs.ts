import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `instagram/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/instagram/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zInstagramPostsBody = z.object({
    handles: z.string()
        .describe(
            "Instagram username (e.g. natgeo) or profile URL to pull posts from.",
        )
        .optional(),
    tab: z.enum(["posts", "reels", "tagged"])
        .describe(
            "Which profile tab to pull: the posts grid (photos + videos), the Reels tab, or posts the profile is tagged in.",
        )
        .optional(),
    postUrls: z.array(z.string())
        .describe(
            "Instagram post or reel URLs, one per line. Returns the full record for each.",
        )
        .optional(),
    hashtags: z.string()
        .describe(
            "Hashtag to pull recent posts from, without the # (e.g. travel).",
        )
        .optional(),
    query: z.string()
        .describe(
            "Search keyword. Returns matching Reels from Instagram search.",
        )
        .optional(),
    maxPages: z.number().int()
        .describe(
            "Keyword-search result pages to fetch (~10-12 reels per page, capped at 8).",
        )
        .optional(),
    maxResults: z.number().int()
        .describe("Number of posts to return in total. Use 0 for all.")
        .optional(),
    onlyPostsNewerThan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
            "Only get posts newer than this date (YYYY-MM-DD). Pinned posts may appear even if older. Format YYYY-MM-DD.",
        )
        .optional(),
}).strict();
