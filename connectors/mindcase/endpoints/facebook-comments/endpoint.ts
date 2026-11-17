import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookCommentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/comments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Comments",
        summary:
            "Extract comments and replies from Facebook posts, reels, and " +
            "photos (text, author, likes, reply count, and thread " +
            "position) by post URL.",
        description:
            "Extract comments and replies from Facebook posts, reels, and " +
            "photos (text, author, likes, reply count, and thread " +
            "position) by post URL. Returns one row per comment with " +
            "postUrl, postId, pageId, commentUrl, commentText, " +
            "commentDate, likes, replies, replyDepth, isReply, commenter, " +
            "commenterUrl, commenterId, replyingTo, threadRootAuthor, " +
            "commentMediaType, commentMediaCaption, commentMediaUrl, " +
            "commenterPicture, postCaption, replyingToDetails. For the " +
            "posts themselves use mindcase#facebook/posts. $0.0025 per " +
            "comment; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/comments",
        categories: ["facebook"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/comments",
    request: { method: "POST", path: "/v1/data/facebook/comments/run" },
    input: {
        schema: {
            body: zFacebookCommentsBody.extend({
                maxResults: zFacebookCommentsBody.shape.maxResults.unwrap().min(
                    1,
                ).describe(
                    "Number of comments to return. Required, at least 1.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
