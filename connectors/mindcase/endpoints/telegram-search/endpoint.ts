import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTelegramSearchBody } from "./schema/inputs.ts";

/**
 * Mindcase `telegram/search`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Telegram Search",
        summary: "Telegram posts matching a keyword, with channel handle and " +
            "title, posted time and text.",
        description:
            "Telegram posts matching a keyword, with channel handle and " +
            "title, posted time and text. Returns one row per post with " +
            "postUrl, postId, channelHandle, channelTitle, searchKeyword, " +
            "postedAt, text, viewsApprox, reactions, reactionBreakdown, " +
            "contentType, isEdited, author, forwardedFrom, " +
            "forwardedFromUrl, replyToUrl, linkPreview, outboundLinks, " +
            "hashtags, photoUrls, videoUrls, channelId, " +
            "channelSubscribersApprox, channelVerified. For every post " +
            "from a known channel use mindcase#telegram/posts. $0.0065 " +
            "per post; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/telegram/search",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/telegram/search",
    request: { method: "POST", path: "/v1/data/telegram/search/run" },
    input: {
        schema: {
            body: zTelegramSearchBody.extend({
                maxResults: zTelegramSearchBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0065 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
