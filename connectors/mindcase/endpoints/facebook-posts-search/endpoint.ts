import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookPostsSearchBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/posts-search`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Posts Search",
        summary: "Get Facebook posts with post url, query, content type, " +
            "posted at, text, reactions, by search keywords.",
        description: "Get Facebook posts with post url, query, content type, " +
            "posted at, text, reactions, by search keywords. Returns one " +
            "row per post with postId, postUrl, query, contentType, " +
            "postedAt, text, reactions, comments, shares, videoDuration, " +
            "reactionBreakdown, author, source, media, hashtags. For all " +
            "posts from a known page use mindcase#facebook/posts; for " +
            "comments use mindcase#facebook/comments. $0.005 per post; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/posts-search",
        categories: ["facebook"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/posts-search",
    request: { method: "POST", path: "/v1/data/facebook/posts-search/run" },
    input: {
        schema: {
            body: zFacebookPostsSearchBody.extend({
                maxResults: zFacebookPostsSearchBody.shape.maxResults.unwrap()
                    .min(1).default(100).describe(
                        "How many posts to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
