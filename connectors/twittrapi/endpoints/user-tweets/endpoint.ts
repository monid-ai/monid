import { defineEndpoint } from "@shared/core";
import { zUserPathParams } from "../../schema/common.ts";
import { zUserTweetsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /user/{userId}/tweets` — a profile's tweets (no replies), newest first, one page per call.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Tweets",
        summary:
            "A profile's tweets (no replies), newest first, one page per call.",
        description:
            "Read the tweets on an X (Twitter) profile timeline, newest first and " +
            "without replies, one page per call: text, created time, engagement " +
            "counts, media, language, quoted/retweeted tweets and the author. Page " +
            "further with `cursor`. With replies use " +
            "twittrapi#user/{userId}/tweets-and-replies; only photos and videos use " +
            "twittrapi#user/{userId}/media; for topic or keyword search across " +
            "accounts use twittrapi#search.",
        docsUrl: "https://www.twittrapi.com/docs/reference/user-userid-tweets",
        categories: ["twitter"],
        notes: [
            'Pass the numeric `userId`, or `userId: "-1"` with `username` set to a ' +
            "handle; the handle costs no extra call.",
        ],
    },
    request: { method: "GET", path: "/user/{userId}/tweets" },
    input: {
        schema: {
            pathParams: zUserPathParams,
            queryParams: zUserTweetsQueryParams,
        },
    },
});
