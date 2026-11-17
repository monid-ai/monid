import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditCommentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `reddit/comments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Reddit Comments",
        summary:
            "Extract every comment from a Reddit post: the full threaded " +
            "discussion flattened to one row per comment, at any reply " +
            "depth.",
        description:
            "Extract every comment from a Reddit post: the full threaded " +
            "discussion flattened to one row per comment, at any reply " +
            "depth. Returns one row per result with commentUrl, " +
            "commentId, comment, depth, author, authorFlair, isOp, " +
            "upvotes, posted, edited, parentId, postId, postUrl, post, " +
            "subreddit. Call it by post url (inputs) or comment search " +
            "(subreddit, keyword). For the posts use " +
            "mindcase#reddit/posts. $0.005 per result; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/reddit/comments",
        categories: ["reddit"],
        notes: [
            "`maxResults` does not apply to `inputs`: those return one " +
            "row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/reddit/comments",
    request: { method: "POST", path: "/v1/data/reddit/comments/run" },
    input: {
        schema: {
            body: zRedditCommentsBody.extend({
                maxResults: zRedditCommentsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of comments to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = (body.subreddit?.length ?? 0) +
                (body.keyword ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped =
                (body.inputs ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
