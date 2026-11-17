import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPipixiaPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `pipixia/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pipixia Posts",
        summary: "Pipixia posts with type, caption, topic, posted date and " +
            "views. Search by keyword.",
        description:
            "Pipixia posts with type, caption, topic, posted date and " +
            "views. Search by keyword. Returns one row per post with " +
            "postUrl, postId, postType, caption, topic, postedDate, " +
            "views, plays, likes, comments, shares, saves, durationS, " +
            "imageCount, thumbnail, videoUrl, ipLocation, author, " +
            "sourceQuery. $0.0065 per post; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/pipixia/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/pipixia/posts",
    request: { method: "POST", path: "/v1/data/pipixia/posts/run" },
    input: {
        schema: {
            body: zPipixiaPostsBody.extend({
                maxResults: zPipixiaPostsBody.shape.maxResults.unwrap().min(1)
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
