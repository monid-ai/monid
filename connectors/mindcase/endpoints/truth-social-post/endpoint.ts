import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTruthSocialPostBody } from "./schema/inputs.ts";

/**
 * Mindcase `truth-social/post`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Truth Social Post",
        summary: "Truth Social posts with text, URL, posted date, language, " +
            "likes and reposts. Pass the handles.",
        description:
            "Truth Social posts with text, URL, posted date, language, " +
            "likes and reposts. Pass the handles. Returns one row per " +
            "post with postId, postUrl, postText, postedDate, language, " +
            "likes, reposts, replies, isPinned, isQuote, isSensitive, " +
            "repostedPostUrl, repostedPostText, originalPostDate, " +
            "quotedPostUrl, quotedPostText, hashtags, mentions, linkCard, " +
            "postMedia, authorId, authorHandle. $0.0025 per post; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/truth-social/post",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/truth-social/post",
    request: { method: "POST", path: "/v1/data/truth-social/post/run" },
    input: {
        schema: {
            body: zTruthSocialPostBody.extend({
                maxResults: zTruthSocialPostBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe("How many posts to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
