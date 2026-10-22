import { defineEndpoint } from "@shared/core";
import { zUserPathParams } from "../../schema/common.ts";
import { zUserTweetsAndRepliesQueryParams } from "./schema/inputs.ts";

/**
 * `GET /user/{userId}/tweetsAndReplies` — a profile's tweets and replies, newest first, one page per call.
 *
 * Identity is pinned to `/user/{userId}/tweets-and-replies`: endpoint ids are lowercase,
 * and the vendor's camelCase segment cannot be one (design D22).
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Tweets and Replies",
        summary:
            "A profile's tweets and replies, newest first, one page per call.",
        description:
            "Read an X (Twitter) profile's tweets AND replies, newest first, one page " +
            "per call, each with text, counts, media and the replied-to tweet id. " +
            "Page further with `cursor`. Without replies use " +
            "twittrapi#user/{userId}/tweets.",
        docsUrl:
            "https://www.twittrapi.com/docs/reference/user-userid-tweetsandreplies",
        categories: ["twitter"],
        notes: [
            'Pass the numeric `userId`, or `userId: "-1"` with `username` set to a ' +
            "handle; the handle costs no extra call.",
        ],
    },
    endpoint: "/user/{userId}/tweets-and-replies",
    request: { method: "GET", path: "/user/{userId}/tweetsAndReplies" },
    input: {
        schema: {
            pathParams: zUserPathParams,
            queryParams: zUserTweetsAndRepliesQueryParams,
        },
    },
});
