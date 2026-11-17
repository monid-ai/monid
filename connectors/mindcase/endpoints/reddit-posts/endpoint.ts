import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditPostsBody } from "./schema/inputs.ts";

/**
 * Mindcase `reddit/posts`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Reddit Posts",
        summary: "Extract Reddit posts from any subreddit, post, user, or " +
            "feed, with an optional keyword search on top. Posts only (no " +
            "comment tree).",
        description:
            "Extract Reddit posts from any subreddit, post, user, or " +
            "feed, with an optional keyword search on top. Posts only (no " +
            "comment tree). Returns one row per result with type, " +
            "redditUrl, redditId, title, body, subreddit, flair, author, " +
            "authorFlair, upvotes, upvoteRatio, commentCount, gallery, " +
            "externalLink, over18, posted, edited. For the comment thread " +
            "use mindcase#reddit/comments; for a user's karma and bio use " +
            "mindcase#reddit/profiles. $0.005 per result; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/reddit/posts",
        categories: ["reddit"],
        notes: [
            "Adds a flat $0.0005 search fee per run, charged even when " +
            "nothing is found.",
            "Requires a Reddit URL (subreddit, user, post or feed), a " +
            "search keyword, or both.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/reddit/posts",
    request: { method: "POST", path: "/v1/data/reddit/posts/run" },
    input: {
        schema: {
            body: zRedditPostsBody.extend({
                maxResults: zRedditPostsBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of posts to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                row: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "results",
                    description: "results returned",
                    consumes: { credit: "default", amount: 0.005 },
                },
                search_default: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per default run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.0005 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { row: rows, search_default: 1 } };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return { counts: { row: delivered, search_default: 1 } };
        },
    },
});
