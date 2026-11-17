import { defineEndpoint } from "@shared/core";
import { zTweetPathParams } from "../../schema/common.ts";
import { zTweetQuotesQueryParams } from "./schema/inputs.ts";

/**
 * `GET /tweet/{tweetId}/quotes` — tweets that quote a given tweet, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Quote Tweets",
        summary: "Tweets that quote a given tweet, one page per call.",
        description:
            "List the tweets that quote an X (Twitter) tweet, one page per call, each " +
            'with its text, counts, media and author. `rankingMode: "Recency"` ' +
            "returns the newest quotes first (the Latest tab); anything else uses the " +
            "Top tab. Page further with `cursor`. For the accounts that retweeted it " +
            "use twittrapi#tweet/{tweetId}/retweets.",
        docsUrl:
            "https://www.twittrapi.com/docs/reference/tweet-tweetid-quotes",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/tweet/{tweetId}/quotes" },
    input: {
        schema: {
            pathParams: zTweetPathParams,
            queryParams: zTweetQuotesQueryParams,
        },
    },
});
