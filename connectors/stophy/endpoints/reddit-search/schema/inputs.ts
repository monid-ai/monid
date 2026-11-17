import { z } from "zod";
import { zCursor } from "../../../schema/common.ts";

/** `POST /v1/reddit/search` request body — the faithful vendor mirror. */
export const zRedditSearchBody = z.object({
    query: z.string().min(1).max(512).describe(
        "Words to find. With any sort other than relevance, a query of " +
            "several words matches that exact phrase; use sort relevance to " +
            "match the words anywhere in a post. Quotes, AND, OR, NOT, " +
            "title:, selftext:, author:, subreddit: and site: are used as " +
            "typed.",
    ),
    type: z.enum(["posts", "subreddits", "users"]).describe(
        "What to find (vendor default posts).",
    ).optional(),
    subreddit: z.string().optional(),
    sort: z.enum(["relevance", "hot", "top", "newest", "mostComments"])
        .describe(
            "relevance (the default) matches the words anywhere in a post. " +
                "hot, top, newest and mostComments match the exact phrase.",
        ).optional(),
    time: z.enum([
        "pastHour",
        "today",
        "pastWeek",
        "pastMonth",
        "pastYear",
        "allTime",
    ]).describe("Reddit's own time filter. Leave out for Reddit's default.")
        .optional(),
    cursor: zCursor.optional(),
}).strict();
