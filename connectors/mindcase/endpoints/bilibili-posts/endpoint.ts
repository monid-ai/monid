import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBilibiliPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `bilibili/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Bilibili Posts",
        summary: "Bilibili videos with BV and AV IDs, title, description and " +
            "channel details. Search by keyword or pass video URLs.",
        description:
            "Bilibili videos with BV and AV IDs, title, description and " +
            "channel details. Search by keyword or pass video URLs. " +
            "Returns one row per post with videoUrl, bvid, aid, title, " +
            "description, channel, channelId, channelUrl, channelAvatar, " +
            "views, likes, coins, saves, shares, comments, danmaku, " +
            "durationS, published, thumbnail, category, keywords, " +
            "isOriginal, isPaid, sourceQuery. Call it by keyword " +
            "(queries) or video url (urls). $0.0105 per post; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/bilibili/posts",
        categories: ["social-media"],
        notes: [
            "Requires search keywords, or one or more Bilibili video " +
            "URLs.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/bilibili/posts",
    request: { method: "POST", path: "/v1/data/bilibili/posts/run" },
    input: {
        schema: {
            body: zBilibiliPostsBody.extend({
                maxResults: zBilibiliPostsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0105 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
