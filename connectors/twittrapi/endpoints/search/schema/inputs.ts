import { z } from "zod";
import { zCount, zCursor } from "../../../schema/common.ts";

/**
 * The `filters` object (https://www.twittrapi.com/docs/reference/search,
 * "Filter keys"): each key becomes an X search operator appended to the
 * query. Sent JSON-encoded by the provider's `input.toRequest`.
 */
const zSearchFilters = z.object({
    lang: z.string().optional().describe(
        "lang:<code> — a language code X knows, e.g. en, de, ja, und.",
    ),
    since: z.string().optional().describe(
        "since: — YYYY-MM-DD or YYYY-MM-DD_HH:MM:SS_UTC.",
    ),
    until: z.string().optional().describe(
        "until: — YYYY-MM-DD or YYYY-MM-DD_HH:MM:SS_UTC.",
    ),
    sinceTime: z.string().regex(/^[0-9]+$/).optional().describe(
        "since_time: — Unix seconds.",
    ),
    untilTime: z.string().regex(/^[0-9]+$/).optional().describe(
        "until_time: — Unix seconds.",
    ),
    withinTime: z.string().optional().describe(
        "within_time: — e.g. 2d, 3h, 5m, 30s.",
    ),
    sinceId: z.string().regex(/^[0-9]+$/).optional().describe("since_id:"),
    maxId: z.string().regex(/^[0-9]+$/).optional().describe("max_id:"),
    exactSentence: z.string().optional().describe("An exact phrase."),
    anyOfTheseWords: z.array(z.string()).optional().describe(
        "(a OR b OR c)",
    ),
    noneOfTheseWords: z.array(z.string()).optional().describe("-a -b"),
    hashtags: z.array(z.string()).optional().describe(
        "(#a OR #b) — without the #.",
    ),
    fromTheseAccounts: z.array(z.string()).optional().describe(
        "(from:a OR from:b) — handles.",
    ),
    toTheseAccounts: z.array(z.string()).optional().describe(
        "(to:a OR to:b) — handles.",
    ),
    mentionsTheseAccounts: z.array(z.string()).optional().describe(
        "(@a OR @b) — handles.",
    ),
    minimumRepliesCount: z.number().optional().describe("min_replies:"),
    minimumRetweetsCount: z.number().optional().describe("min_retweets:"),
    minimumLikesCount: z.number().optional().describe("min_faves:"),
    maximumRepliesCount: z.number().optional().describe("-min_replies:"),
    maximumRetweetsCount: z.number().optional().describe("-min_retweets:"),
    maximumLikesCount: z.number().optional().describe("-min_faves:"),
    removeReplies: z.boolean().optional().describe("-filter:replies"),
    onlyReplies: z.boolean().optional().describe("filter:replies"),
    removePostsWithLinks: z.boolean().optional().describe("-filter:links"),
    onlyPostsWithLinks: z.boolean().optional().describe("filter:links"),
    removePostsWithMedia: z.boolean().optional().describe("-filter:media"),
    onlyPostsWithMedia: z.boolean().optional().describe("filter:media"),
    removePostsWithVideo: z.boolean().optional().describe(
        "-filter:native_video",
    ),
    onlyPostsWithVideo: z.boolean().optional().describe(
        "filter:native_video",
    ),
    removePostsWithPhotos: z.boolean().optional().describe(
        "-filter:images",
    ),
    onlyPostsWithPhotos: z.boolean().optional().describe("filter:images"),
    linksInclude: z.string().optional().describe("url:<text>"),
    includeRetweets: z.boolean().optional().describe(
        "include:nativeretweets",
    ),
    onlyRetweets: z.boolean().optional().describe("filter:nativeretweets"),
    onlyOldStyleRetweets: z.boolean().optional().describe("filter:retweets"),
    removeOldStyleRetweets: z.boolean().optional().describe(
        "-filter:retweets",
    ),
    onlyQuotes: z.boolean().optional().describe("filter:quote"),
    onlySelfThreads: z.boolean().optional().describe("filter:self_threads"),
    onlyVerified: z.boolean().optional().describe("filter:verified"),
    onlyBlueVerified: z.boolean().optional().describe(
        "filter:blue_verified",
    ),
    listId: z.string().optional().describe("list:<id>"),
    conversationId: z.string().regex(/^[0-9]+$/).optional().describe(
        "conversation_id:",
    ),
    quotedTweetId: z.string().regex(/^[0-9]+$/).optional().describe(
        "quoted_tweet_id:",
    ),
    quotedUserId: z.string().regex(/^[0-9]+$/).optional().describe(
        "quoted_user_id:",
    ),
    hasEngagement: z.boolean().optional().describe("filter:has_engagement"),
    onlyAllVideos: z.boolean().optional().describe("filter:videos"),
    onlySpaces: z.boolean().optional().describe("filter:spaces"),
    onlyGifs: z.boolean().optional().describe("card_name:animated_gif"),
    onlyWithMentions: z.boolean().optional().describe("filter:mentions"),
    onlyWithHashtags: z.boolean().optional().describe("filter:hashtags"),
    onlyNews: z.boolean().optional().describe("filter:news"),
    safeMode: z.boolean().optional().describe("filter:safe"),
    near: z.string().optional().describe("near:"),
    within: z.string().optional().describe("within: — e.g. 10km, 5mi."),
    geocode: z.string().optional().describe(
        "geocode: — lat,long,radius.",
    ),
    place: z.string().optional().describe("place:"),
    source: z.string().optional().describe("source:"),
    cardName: z.string().optional().describe("card_name:"),
    cardDomain: z.string().optional().describe("card_domain:"),
}).strict();

/** `GET /search` query parameters — the vendor mirror, optionality only
 *  (D25). `searchItem` is "required unless filters is set": the endpoint
 *  binding states that as a union. The vendor's `query` alias is not
 *  mirrored (one spelling). */
export const zSearchQueryParams = z.object({
    searchItem: z.string().min(1).max(512).describe(
        "Search query in X search syntax, e.g. `from:XDevelopers lang:en` " +
            'or `"open source" min_faves:100`.',
    ).optional(),
    category: z.enum(["Top", "Latest", "People", "Photos", "Videos"])
        .describe(
            "Search tab (vendor default Top). People returns users instead " +
                "of tweets.",
        ).optional(),
    count: zCount.optional(),
    cursor: zCursor.optional(),
    filters: zSearchFilters.describe(
        "Extra conditions; each key becomes an X search operator appended " +
            'to the query, e.g. {"lang":"en","minimumLikesCount":100}.',
    ).optional(),
}).strict();
