import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeCommunityPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `youtube/community-posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Community Posts",
        summary: "Fetches a channel's community tab posts including text, " +
            "attachment type, like and comment counts and post date, in " +
            "English. Reads up to about 450 recent...",
        description:
            "Fetches a channel's community tab posts including text, " +
            "attachment type, like and comment counts and post date, in " +
            "English. Reads up to about 450 recent posts per channel. " +
            "Returns one row per post with postId, postUrl, channelId, " +
            "channelName, text, published, publishedAsShown, likes, " +
            "comments, attachmentType, inputChannel. For videos use " +
            "mindcase#youtube/videos; for channel stats use " +
            "mindcase#youtube/channels. $0.002 per post; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/youtube/community-posts",
        categories: ["youtube"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/youtube/community-posts",
    request: { method: "POST", path: "/v1/data/youtube/community-posts/run" },
    input: {
        schema: {
            body: zYoutubeCommunityPostsBody.extend({
                maxResults: zYoutubeCommunityPostsBody.shape.maxResults.unwrap()
                    .min(1).default(50).describe(
                        "How many posts to return in total across all channels, shared evenly between them. Each channel is read up to 50 pages (about 450 most recent posts), so very active channels may return fewer posts than their full history.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
