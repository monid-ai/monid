import { z } from "zod";

/**
 * benthepythondev/reddit-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/benthepythondev~reddit-scraper/builds/default →
 * actorDefinition.input) on 2026-10-26 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zRedditScraperBody = z.object({
    mode: z.enum(["subreddit", "post", "user", "search"]).describe(
        "What to scrape from Reddit",
    ).optional(),
    subreddit: z.string().describe(
        "Subreddit to scrape (e.g., 'python' or 'r/python'). A subreddit link or an old RSS feed link such as https://www.reddit.com/r/python/.rss also works. Required for subreddit mode.",
    ).optional(),
    postUrl: z.string().describe(
        "Full URL of Reddit post to scrape (for post mode)",
    ).optional(),
    username: z.string().describe(
        "Reddit username to scrape posts from (for user mode)",
    ).optional(),
    searchQuery: z.string().describe(
        "Search query to find posts (for search mode)",
    ).optional(),
    searchSubreddit: z.string().describe(
        "Limit search to specific subreddit (optional for search mode)",
    ).optional(),
    sort: z.enum(["hot", "new", "top", "rising", "controversial", "relevance"])
        .describe("How to sort posts").optional(),
    timeFilter: z.enum(["hour", "day", "week", "month", "year", "all"])
        .describe("Time range for top/controversial sort").optional(),
    maxPosts: z.number().int().min(0).max(10000).describe(
        "Maximum number of posts to scrape (0 = unlimited)",
    ).optional(),
    deepScrape: z.boolean().describe(
        "Reddit ends a subreddit list after about 950 posts and a search after about 240. When on, the Actor also reads the other orders and time ranges of the same subreddit or search and adds the posts it has not saved yet, until Maximum Posts: about 2,400 posts of a large subreddit and about 1,100 of a...",
    ).optional(),
    onlyNew: z.boolean().describe(
        "Watch a subreddit, search or user: every run returns only the posts earlier runs of the watch have not returned, oldest first, so a schedule gives you a feed of new posts (export it as RSS, or send it to Slack or a webhook through an integration). The first run returns the newest posts up to Maxi...",
    ).optional(),
    watchName: z.string().describe(
        "Optional. Runs with the same target and the same name share one memory of delivered posts. Give two schedules on the same subreddit or search different names to keep them apart.",
    ).optional(),
    maxComments: z.number().int().min(0).max(10000).describe(
        "Maximum comments to scrape per post (applies to both post mode and subreddit mode with includeComments, 0 = unlimited)",
    ).optional(),
    includeComments: z.boolean().describe(
        "Scrape comments for each post in subreddit mode (slower but more data)",
    ).optional(),
    expandMoreComments: z.boolean().describe(
        "When ON (default), resolves Reddit's 'load more comments' stubs via /api/morechildren and follows 'continue this thread' links so the scraped count matches num_comments. Turn OFF for faster runs that only return the first ~50 comments per post.",
    ).optional(),
    sinceDate: z.string().describe(
        "Subreddit mode only: keep posts on or after this UTC date (YYYY-MM-DD). Invalid dates and other modes with this field are rejected.",
    ).optional(),
    outputFormat: z.enum(["markdown", "html", "text"]).describe(
        "Format returned in content on posts, comments and nested replies. Original text/Markdown/HTML fields remain available. Plain text is extracted from source HTML; original text is retained when HTML is absent.",
    ).optional(),
    includeImages: z.boolean().describe(
        "Include extracted image URLs and thumbnails. False returns an empty images array and a null thumbnail; post URLs and links within the original text remain unchanged.",
    ).optional(),
    delaySeconds: z.number().describe(
        "Delay between Reddit API requests to respect rate limits",
    ).optional(),
    debugMode: z.boolean().describe("Enable detailed logging for debugging")
        .optional(),
});
