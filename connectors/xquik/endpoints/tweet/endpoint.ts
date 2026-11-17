import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTweetPathParams, zTweetQueryParams } from "./schema/inputs.ts";

/** GET /x/tweets/{id}, 1 X (Twitter) tweet. */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Tweet",
        summary: "Read 1 X (Twitter) tweet with its author, counts & media.",
        description: "Read 1 X (Twitter) tweet by ID or URL. The tweet " +
            "carries its full text, author, counts, media, links & " +
            "creation time. Counts cover likes, reposts, replies, quotes, " +
            "views & bookmarks. Long " +
            "tweets come back whole. Use xquik#x/tweets/search to find " +
            "tweets by keyword.",
        docsUrl: "https://docs.xquik.com/api-reference/x/get-tweet",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/x/tweets/{id}" },
    input: {
        schema: {
            pathParams: zTweetPathParams.extend({
                // A bare search or top would route to Xquik's own
                // search/top reads instead of this lookup.
                id: zTweetPathParams.shape.id.regex(/^(?!(?:search|top)$)/)
                    .describe(
                        "Tweet ID or tweet URL, such as x.com/nasa/status/20.",
                    ),
            }),
            queryParams: zTweetQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1 },
        },
    },
});
