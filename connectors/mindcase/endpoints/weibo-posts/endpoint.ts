import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWeiboPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `weibo/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Weibo Posts",
        summary: "Weibo posts with text, posted date and author details. " +
            "Search by keyword or pass user IDs.",
        description: "Weibo posts with text, posted date and author details. " +
            "Search by keyword or pass user IDs. Returns one row per post " +
            "with postUrl, postId, text, posted, authorId, authorName, " +
            "authorProfileUrl, authorVerified, authorVerifiedReason, " +
            "authorFollowers, likes, comments, reposts, region, hashtags, " +
            "images, videoUrl, durationS, isRepost, repostOf, isPromoted, " +
            "input. Call it by search query (query) or user ids " +
            "(userIds). $0.021 per post; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/weibo/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/weibo/posts",
    request: { method: "POST", path: "/v1/data/weibo/posts/run" },
    input: {
        schema: {
            body: zWeiboPostsBody.extend({
                maxResults: zWeiboPostsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.021 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
