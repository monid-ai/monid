import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeCommentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `youtube/comments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Comments",
        summary: "Extract YouTube comments (text, likes, replies, author " +
            "details, and publish date) from any video URL.",
        description: "Extract YouTube comments (text, likes, replies, author " +
            "details, and publish date) from any video URL. Returns one " +
            "row per comment with comment, likes, replies, author, " +
            "authorChannelId, authorVerified, authorIsArtist, " +
            "authorIsOwner, authorThumbnail, published, " +
            "publishedRelative, commentId, videoUrl, commentUrl. For the " +
            "video itself use mindcase#youtube/videos. $0.0005 per " +
            "comment; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/youtube/comments",
        categories: ["youtube"],
        notes: [
            "`maxResults` must be at least 100 here; the raw API reads 0 " +
            "or blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/youtube/comments",
    request: { method: "POST", path: "/v1/data/youtube/comments/run" },
    input: {
        schema: {
            body: zYoutubeCommentsBody.extend({
                maxResults: zYoutubeCommentsBody.shape.maxResults.unwrap().min(
                    100,
                ).describe(
                    "Number of comments to return (minimum 100). Required, at least 100.",
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
