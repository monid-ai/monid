import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWechatChannelsBody } from "./schema/inputs.ts";

/**
 * Mindcase `wechat/channels`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "WeChat Channels",
        summary: "WeChat Channels videos with title, channel, verified flag, " +
            "likes and published date. Search by keyword.",
        description:
            "WeChat Channels videos with title, channel, verified flag, " +
            "likes and published date. Search by keyword. Returns one row " +
            "per channel with videoId, title, channel, channelVerified, " +
            "likesApprox, thumbsUpApprox, published, durationS, " +
            "resolution, thumbnail, channelAvatar, sourceQuery. For " +
            "Official Account articles use mindcase#wechat/articles. " +
            "$0.01 per channel; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/wechat/channels",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/wechat/channels",
    request: { method: "POST", path: "/v1/data/wechat/channels/run" },
    input: {
        schema: {
            body: zWechatChannelsBody.extend({
                maxResults: zWechatChannelsBody.shape.maxResults.unwrap().min(1)
                    .default(50).describe(
                        "How many videos to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
