import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokCommentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/comments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Comments",
        summary: "Top-level TikTok comments: text, likes, reply counts, " +
            "commenter handle and profile, timestamps and mentions. From " +
            "video URLs or by profile.",
        description: "Top-level TikTok comments: text, likes, reply counts, " +
            "commenter handle and profile, timestamps and mentions. From " +
            "video URLs or by profile. Returns one row per comment with " +
            "commentId, commenterUrl, commenterId, commenterAvatar, " +
            "comment, likes, likedByCreator, pinnedByCreator, replies, " +
            "postedDate, mentions, postUrl. Call it by video url " +
            "(postURLs) or profile (profiles). For the video itself use " +
            "mindcase#tiktok/posts; for a video's 14-day growth curve use " +
            "mindcase#tiktok/video-analytics. $0.0005 per comment; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/comments",
        categories: ["tiktok"],
        notes: [
            "`commentsPerPost` must be at least 1 here; the raw API reads " +
            "0 or blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/tiktok/comments",
    request: { method: "POST", path: "/v1/data/tiktok/comments/run" },
    input: {
        schema: {
            body: zTiktokCommentsBody.extend({
                commentsPerPost: zTiktokCommentsBody.shape.commentsPerPost
                    .unwrap().min(1).describe(
                        "Number of comments to return. Actual counts can vary on very high-comment videos due to TikTok API limits. Required, at least 1.",
                    ),
                resultsPerPage: zTiktokCommentsBody.shape.resultsPerPage
                    .unwrap().default(1),
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
            const rows = body.commentsPerPost *
                Math.max(
                    1,
                    (body.postURLs ?? "").split("\n").filter((line: string) =>
                        line.trim() !== ""
                    ).length +
                        (body.profiles ?? "").split("\n").filter((
                                line: string,
                            ) => line.trim() !== ""
                            ).length * body.resultsPerPage,
                );
            return { counts: { RESULT: rows } };
        },
    },
});
