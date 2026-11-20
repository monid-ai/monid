import { z } from "zod";

/**
 * leado/reddit-scraper-pro — actor input schema, scaffolded from the actor's
 * PUBLISHED input schema (GET /v2/acts/leado~reddit-scraper-pro/builds/default
 * → actorDefinition.input) on 2026-11-20; curated by hand thereafter (re-run
 * `deno task apify:scaffold` to refresh; the drift suite flags divergence —
 * `deno task drift`). Non-strict by policy: the actor accepts supersets —
 * unknown fields pass through.
 */
export const zRedditScraperProBody = z.object({
    urls: z.array(z.string()).describe(
        "List of Reddit URLs to scrape: subreddit URLs (https://www.reddit.com/r/SaaS/), direct post URLs (https://www.reddit.com/r/SaaS/comments/...), or user profile URLs (https://www.reddit.com/user/spez/).",
    ).optional(),
    subreddits: z.array(z.string()).describe(
        "Subreddit names to scrape (with or without 'r/' prefix, for example 'SaaS' or 'startups'). Can be used alone or combined with Search Queries.",
    ).optional(),
    searchQueries: z.array(z.string()).describe(
        "Search Reddit posts by keyword or phrase. If Subreddits are also specified, each query runs inside those subreddits; otherwise it searches across all of Reddit.",
    ).optional(),
    usernames: z.array(z.string()).describe(
        "Scrape posts submitted by specific Reddit users (without 'u/' prefix).",
    ).optional(),
    sort: z.enum(["new", "top", "hot"]).describe(
        "Sort order for posts ('new' returns latest posts first; 'top' and 'hot' sort fetched results by score).",
    ).optional(),
    maxPostsPerSource: z.number().int().min(1).max(500).describe(
        "Maximum number of posts to extract per subreddit, search query, or user profile (1 to 500).",
    ).optional(),
    timeWindow: z.enum(["all", "1h", "4h", "24h", "7d", "30d"]).describe(
        "Only return posts newer than the selected time range.",
    ).optional(),
    includeComments: z.boolean().describe(
        "Extract top comments for each scraped post. Automatically enabled when scraping direct post URLs.",
    ).optional(),
    maxCommentsPerPost: z.number().int().min(1).max(100).describe(
        "Maximum number of comments to extract per post when Include Comments is enabled (1 to 100).",
    ).optional(),
    filterKeywords: z.array(z.string()).describe(
        "Optional list of keywords to filter scraped posts (case-insensitive). Leave empty to keep all posts.",
    ).optional(),
    filterKeywordMode: z.enum(["any", "all", "titleOnly"]).describe(
        "How Filter Keywords are matched against posts.",
    ).optional(),
    minScore: z.number().int().min(0).describe(
        "Only keep posts with a score greater than or equal to this value.",
    ).optional(),
    minComments: z.number().int().min(0).describe(
        "Only keep posts that have at least this many comments.",
    ).optional(),
    excludeRemoved: z.boolean().describe(
        "Skip posts and comments that were removed by moderators or AutoMod or deleted by the author.",
    ).optional(),
    includeNSFW: z.boolean().describe(
        "Whether to include NSFW posts in the dataset.",
    ).optional(),
    outputFormat: z.enum(["default", "rag-markdown", "jsonl-finetune"])
        .describe(
            "Choose standard JSON records or AI-ready formats for RAG vector databases and LLM fine-tuning.",
        ).optional(),
});
