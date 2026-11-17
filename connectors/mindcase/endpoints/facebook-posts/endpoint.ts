import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Posts and Groups",
        summary: "Posts and reels from any public Facebook page, profile or " +
            "group: text, author, reactions by type, comments, shares, " +
            "views, media, links and mentions.",
        description:
            "Posts and reels from any public Facebook page, profile or " +
            "group: text, author, reactions by type, comments, shares, " +
            "views, media, links and mentions. Returns one row per post " +
            "with contentType, postUrl, postId, postedAt, text, " +
            "reactions, comments, shares, views, videoDuration, " +
            "reactionBreakdown, author, source, media, linkPreview, " +
            "mentions, collaborators, topComments, hashtags. Pull recent " +
            "posts and reels from a public Facebook page/profile URL, or " +
            "member posts from a public group URL. To search posts by " +
            "keyword instead of by page use " +
            "mindcase#facebook/posts-search; for comments on a post use " +
            "mindcase#facebook/comments; for reels with play counts use " +
            "mindcase#facebook/reels. $0.005 per post; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/posts",
        categories: ["facebook"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/posts",
    request: { method: "POST", path: "/v1/data/facebook/posts/run" },
    input: {
        schema: {
            body: zFacebookPostsBody.extend({
                maxResults: zFacebookPostsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of posts to return. Required, at least 1.",
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
