import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTelegramPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `telegram/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Telegram Posts",
        summary:
            "Posts from public Telegram channels with text, posted time, " +
            "views and reaction breakdown. Pass the channels.",
        description:
            "Posts from public Telegram channels with text, posted time, " +
            "views and reaction breakdown. Pass the channels. Returns one " +
            "row per post with postUrl, postId, channelHandle, postedAt, " +
            "text, views, reactionBreakdown, isEdited, authorSignature, " +
            "replyToPostUrl, forwardedFrom, hashtags, mentions, " +
            "outboundLinks, media, author. To search across channels by " +
            "keyword use mindcase#telegram/search; for channel profile " +
            "and subscribers use mindcase#telegram/channels. $0.002 per " +
            "post; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/telegram/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/telegram/posts",
    request: { method: "POST", path: "/v1/data/telegram/posts/run" },
    input: {
        schema: {
            body: zTelegramPostsBody.extend({
                maxResults: zTelegramPostsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
