import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWechatArticlesBody } from "./schema/inputs.ts";

/**
 * Mindcase `wechat/articles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "WeChat Articles",
        summary: "WeChat Official Account articles with title, link, source, " +
            "summary and published date. Search by keyword or account.",
        description:
            "WeChat Official Account articles with title, link, source, " +
            "summary and published date. Search by keyword or account. " +
            "Returns one row per article with articleUrl, articleLink, " +
            "title, source, accountId, summary, publishedAt, " +
            "publishedTimestamp, imageUrl, keyword, pushPosition, isPaid. " +
            "For WeChat Channels videos use mindcase#wechat/channels. " +
            "$0.0045 per article; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/wechat/articles",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/wechat/articles",
    request: { method: "POST", path: "/v1/data/wechat/articles/run" },
    input: {
        schema: {
            body: zWechatArticlesBody.extend({
                maxResults: zWechatArticlesBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe(
                        "How many articles to return in total.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
