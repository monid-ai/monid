import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLemon8PostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `lemon8/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Lemon8 Posts",
        summary: "Lemon8 posts with title, caption, type, posted date and " +
            "likes. Search by keyword or hashtag.",
        description:
            "Lemon8 posts with title, caption, type, posted date and " +
            "likes. Search by keyword or hashtag. Returns one row per " +
            "post with postUrl, postId, title, caption, type, posted, " +
            "likes, comments, saves, views, hashtags, images, thumbnail, " +
            "videoUrl, authorUsername, authorName, authorProfileUrl, " +
            "authorVerified, authorId, authorFollowers, region, " +
            "sourceQuery. Call it by search keywords (queries) or " +
            "hashtags (hashtags). $0.0045 per post; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/lemon8/posts",
        categories: ["social-media"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/lemon8/posts",
    request: { method: "POST", path: "/v1/data/lemon8/posts/run" },
    input: {
        schema: {
            body: zLemon8PostsBody.extend({
                maxResults: zLemon8PostsBody.shape.maxResults.unwrap().min(1)
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
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
