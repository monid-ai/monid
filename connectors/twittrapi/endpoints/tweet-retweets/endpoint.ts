import { defineEndpoint } from "@shared/core";
import { zTweetPathParams } from "../../schema/common.ts";
import { zTweetRetweetsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /tweet/{tweetId}/retweets` — accounts that retweeted a given tweet, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Retweeters",
        summary: "Accounts that retweeted a given tweet, one page per call.",
        description:
            "List the X (Twitter) accounts that retweeted a tweet, one page per call, " +
            "as flat user profiles (handle, name, bio, location, follower and " +
            "following counts, verification, created time). Page further with " +
            "`cursor`. For tweets quoting it use twittrapi#tweet/{tweetId}/quotes.",
        docsUrl:
            "https://www.twittrapi.com/docs/reference/tweet-tweetid-retweets",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/tweet/{tweetId}/retweets" },
    input: {
        schema: {
            pathParams: zTweetPathParams,
            queryParams: zTweetRetweetsQueryParams,
        },
    },
});
