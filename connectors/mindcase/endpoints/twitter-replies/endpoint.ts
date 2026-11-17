import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitterRepliesBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitter/replies`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitter / X Replies",
        summary: "Every reply to a tweet as a full tweet record: author, " +
            "engagement, media, quotes. The original is included, flagged " +
            "so you can tell them apart.",
        description: "Every reply to a tweet as a full tweet record: author, " +
            "engagement, media, quotes. The original is included, flagged " +
            "so you can tell them apart. Returns one row per replie with " +
            "tweetUrl, tweetText, postedDate, language, isReply, views, " +
            "likes, retweets, replies, quotes, bookmarks, replyToHandle, " +
            "replyToTweetUrl, quotedTweetUrl, quotedTweetText, hashtags, " +
            "mentions, outboundLinks, tweetMedia, author. For the tweets " +
            "themselves use mindcase#twitter/tweets; for who retweeted " +
            "use mindcase#twitter/retweeters. $0.00025 per replie; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitter/replies",
        categories: ["twitter"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/twitter/replies",
    request: { method: "POST", path: "/v1/data/twitter/replies/run" },
    input: {
        schema: {
            body: zTwitterRepliesBody.extend({
                maxResults: zTwitterRepliesBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of replies to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.00025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
