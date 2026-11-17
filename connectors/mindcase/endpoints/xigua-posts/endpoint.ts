import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zXiguaPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `xigua/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Xigua Posts",
        summary: "Xigua videos with title, description, author, posted date, " +
            "views and likes. Search by keyword.",
        description:
            "Xigua videos with title, description, author, posted date, " +
            "views and likes. Search by keyword. Returns one row per post " +
            "with postUrl, title, description, author, postedDate, views, " +
            "likes, comments, shares, saves, danmaku, durationS, " +
            "category, categories, thumbnail, stats, searchRank, " +
            "sourceQuery. $0.002 per post; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/xigua/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/xigua/posts",
    request: { method: "POST", path: "/v1/data/xigua/posts/run" },
    input: {
        schema: {
            body: zXiguaPostsBody.extend({
                maxResults: zXiguaPostsBody.shape.maxResults.unwrap().min(1)
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
