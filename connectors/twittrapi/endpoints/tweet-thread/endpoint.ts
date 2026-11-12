import { defineEndpoint } from "@shared/core";
import { zTweetPathParams } from "../../schema/common.ts";
import { zTweetThreadQueryParams } from "./schema/inputs.ts";

/**
 * `GET /tweet/{tweetId}` — a tweet plus one page of its reply thread.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get an X (Twitter) Tweet with Replies",
        summary: "A tweet plus one page of its reply thread.",
        description:
            "Read an X (Twitter) tweet together with its reply thread: the focal " +
            "tweet (with author, media and counts) and one page of replies as tweets " +
            "in `data`. `rankingMode` orders the replies (Relevance, Recency or " +
            "Likes); page further with `cursor`. For just the tweet use " +
            "twittrapi#simpletweet/{tweetId}; for tweets that quote it use " +
            "twittrapi#tweet/{tweetId}/quotes.",
        docsUrl: "https://www.twittrapi.com/docs/reference/tweet-tweetid",
        categories: ["twitter"],
        notes: [
            "A tweet that does not exist or was deleted returns an empty page or " +
            "a 404; both settle with zero usage.",
        ],
    },
    request: { method: "GET", path: "/tweet/{tweetId}" },
    input: {
        schema: {
            pathParams: zTweetPathParams,
            queryParams: zTweetThreadQueryParams,
        },
    },
});
