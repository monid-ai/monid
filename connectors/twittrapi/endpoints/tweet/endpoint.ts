import { defineEndpoint } from "@shared/core";
import { zNoQueryParams, zTweetPathParams } from "../../schema/common.ts";

/**
 * `GET /simpletweet/{tweetId}` — one tweet by ID with its author, media and engagement counts.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get an X (Twitter) Tweet",
        summary:
            "One tweet by ID with its author, media and engagement counts.",
        description:
            "Look up one X (Twitter) tweet by its numeric ID and get it as flat JSON: " +
            "text, created time, language, like/retweet/reply/quote/bookmark/view " +
            "counts, media, URLs, hashtags and mentions, the quoted or replied-to " +
            "tweet ids, and the author's profile. No reply thread — use " +
            "twittrapi#tweet/{tweetId} for the tweet with its replies, " +
            "twittrapi#tweet/{tweetId}/quotes for quote tweets.",
        docsUrl: "https://www.twittrapi.com/docs/reference/simpletweet-tweetid",
        categories: ["twitter"],
        notes: [
            "A tweet id that does not exist returns `data: null` (usage 0); a " +
            "404 from the vendor settles as a provider error with zero usage.",
        ],
    },
    request: { method: "GET", path: "/simpletweet/{tweetId}" },
    input: {
        schema: {
            pathParams: zTweetPathParams,
            queryParams: zNoQueryParams,
        },
    },
});
