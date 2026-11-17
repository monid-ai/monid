import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitterArticlesBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitter/articles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitter Articles",
        summary:
            "Long-form X (Twitter) Articles with title, preview text and " +
            "the full article as text and Markdown. Pass the article " +
            "URLs.",
        description:
            "Long-form X (Twitter) Articles with title, preview text and " +
            "the full article as text and Markdown. Pass the article " +
            "URLs. Returns one row per article with tweetUrl, tweetId, " +
            "articleId, title, previewText, articleText, articleMarkdown, " +
            "contentBlocks, postedDate, lifecycle, views, likes, " +
            "retweets, replies, quotes, bookmarks, coverImage, authorId, " +
            "author. For regular tweets use mindcase#twitter/tweets. " +
            "$0.0045 per article; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitter/articles",
        categories: ["twitter"],
    },
    endpoint: "/twitter/articles",
    request: { method: "POST", path: "/v1/data/twitter/articles/run" },
    input: {
        schema: {
            body: zTwitterArticlesBody,
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
            const capped = body.urls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
