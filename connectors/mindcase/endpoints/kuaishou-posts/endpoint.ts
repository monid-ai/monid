import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zKuaishouPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `kuaishou/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Kuaishou Posts",
        summary:
            "Kuaishou videos with caption, author, posted date, views and " +
            "likes. Search by keyword.",
        description:
            "Kuaishou videos with caption, author, posted date, views and " +
            "likes. Search by keyword. Returns one row per post with " +
            "postUrl, postId, caption, author, postedDate, views, likes, " +
            "comments, shares, saves, hashtags, thumbnail, durationS, " +
            "resolution, sound, location, sourceQuery. $0.01 per post; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/kuaishou/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/kuaishou/posts",
    request: { method: "POST", path: "/v1/data/kuaishou/posts/run" },
    input: {
        schema: {
            body: zKuaishouPostsBody.extend({
                maxResults: zKuaishouPostsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
