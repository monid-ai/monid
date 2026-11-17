import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zThreadsPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `threads/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Threads Posts",
        summary: "Get Threads posts with post id, text, posted, author " +
            "username, author name, author id, by handles or search " +
            "keywords.",
        description: "Get Threads posts with post id, text, posted, author " +
            "username, author name, author id, by handles or search " +
            "keywords. Returns one row per post with postUrl, postId, " +
            "text, posted, authorUsername, authorName, authorId, " +
            "authorVerified, authorProfileUrl, likes, replies, reposts, " +
            "quotes, shares, views, likesHidden, type, image, videoUrl, " +
            "images, videos, altText, hashtags, mentions, outboundLinks, " +
            "linkPreview, language, isReply, replyToUsername, isQuote and " +
            "10 more fields. Call it by handles (handles) or search " +
            "keywords (queries). For profile stats use " +
            "mindcase#threads/profiles. $0.0025 per post; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/threads/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/threads/posts",
    request: { method: "POST", path: "/v1/data/threads/posts/run" },
    input: {
        schema: {
            body: zThreadsPostsBody.extend({
                maxResults: zThreadsPostsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many posts to return in total.",
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
