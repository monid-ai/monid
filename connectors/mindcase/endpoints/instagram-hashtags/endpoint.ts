import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramHashtagsBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/hashtags`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Hashtags",
        summary: "Instagram hashtag stats with post count, related hashtags " +
            "and top posts. Pass the hashtags to look up.",
        description:
            "Instagram hashtag stats with post count, related hashtags " +
            "and top posts. Pass the hashtags to look up. Returns one row " +
            "per hashtag with hashtagId, hashtag, hashtagUrl, posts, " +
            "postsAnalyzed, relatedHashtags, topPosts, recentPosts. For " +
            "every post under a hashtag use mindcase#instagram/posts. " +
            "$0.019 per hashtag; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/hashtags",
        categories: ["instagram"],
    },
    endpoint: "/instagram/hashtags",
    request: { method: "POST", path: "/v1/data/instagram/hashtags/run" },
    input: {
        schema: {
            body: zInstagramHashtagsBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.019 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.hashtags.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
