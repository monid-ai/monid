import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `linkedin/posts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/linkedin/posts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zLinkedinPostsBody = z.object({
    urls: z.string()
        .describe(
            "LinkedIn URL to scrape posts from: profile, company, post, or feed links.",
        )
        .optional(),
    queries: z.string()
        .describe("Keyword to search LinkedIn posts for.")
        .optional(),
    maxResults: z.number().int()
        .describe("Posts to return. Use 0 for all.")
        .optional(),
    postedLimit: z.enum([
        "any",
        "1h",
        "24h",
        "week",
        "month",
        "3months",
        "6months",
        "year",
    ])
        .describe("Only posts within this time window.")
        .optional(),
    includeQuotePosts: z.boolean()
        .describe("Quote posts (shared with commentary).")
        .optional(),
    includeReposts: z.boolean()
        .describe("Reposts (shared without commentary).")
        .optional(),
    sortBy: z.enum(["relevance", "date"])
        .describe("Sort order for results.")
        .optional(),
    authors: z.array(z.string())
        .describe(
            "Filter posts to specific authors. Accepts profile URLs or company names ('Google').",
        )
        .optional(),
    mentioning: z.array(z.string())
        .describe(
            "Filter posts that mention specific people or companies. Accepts profile URLs or names.",
        )
        .optional(),
    contentType: z.enum([
        "all",
        "videos",
        "images",
        "jobs",
        "live_videos",
        "documents",
        "collaborative_articles",
    ])
        .describe("Filter to a specific media type.")
        .optional(),
}).strict();
