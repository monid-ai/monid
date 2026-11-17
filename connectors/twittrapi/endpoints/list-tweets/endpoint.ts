import { defineEndpoint } from "@shared/core";
import { zListTweetsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /lists/tweets` — tweets from the members of an X List, newest first.
 *
 * Billing, output and the wire profile are inherited from the provider:
 * one page per call at the flat per-call card, settled 0|1 off `data`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) List Tweets",
        summary: "Tweets from the members of an X List, newest first.",
        description:
            "Read the timeline of an X (Twitter) List — tweets from its members, " +
            "newest first, one page per call, each with text, counts, media and " +
            "author. A curated list is a cheap way to follow many accounts in one " +
            "call. Page further with `cursor`. For who is on the list use " +
            "twittrapi#lists/members.",
        docsUrl: "https://www.twittrapi.com/docs/reference/lists-tweets",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/lists/tweets" },
    input: {
        schema: {
            queryParams: zListTweetsQueryParams,
        },
    },
});
