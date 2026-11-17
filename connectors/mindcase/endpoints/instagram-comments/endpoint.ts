import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramCommentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/comments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Comments",
        summary: "Extract top Instagram comments (text, timestamps, likes, " +
            "commenter details, and thread sizes) from post or reel URLs.",
        description:
            "Extract top Instagram comments (text, timestamps, likes, " +
            "commenter details, and thread sizes) from post or reel URLs. " +
            "Returns one row per comment with postUrl, comment, " +
            "commentUrl, commentedAt, likes, commentReplies, commenterId, " +
            "commenterUsername, commenterName, commenterUrl, " +
            "commenterVerified, commenterPrivate. For who liked the post " +
            "use mindcase#instagram/likers; for the post itself use " +
            "mindcase#instagram/posts. $0.0005 per comment; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/comments",
        categories: ["instagram"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/instagram/comments",
    request: { method: "POST", path: "/v1/data/instagram/comments/run" },
    input: {
        schema: {
            body: zInstagramCommentsBody.extend({
                maxResults: zInstagramCommentsBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Total number of top-level comments to return. Replies inside threads are not returned; the Comment Replies column counts them. Capped at 10,000 per post. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
