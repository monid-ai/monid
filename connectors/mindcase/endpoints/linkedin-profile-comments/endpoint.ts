import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileCommentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/profile-comments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Profile Comments",
        summary: "Extract LinkedIn profile comments and their social " +
            "activities like likes and reactions, requiring no input.",
        description: "Extract LinkedIn profile comments and their social " +
            "activities like likes and reactions, requiring no input. " +
            "Returns one row per comment with comment, commentUrl, " +
            "commentId, commentedAt, edited, isReply, mentions, " +
            "commentReactions, commentReplies, commenterUrl, onOwnPost, " +
            "postUrl, postId, postText, postAuthor, postAuthorUrl, " +
            "postAuthorProfileId, postAuthorHandle, postAuthorType, " +
            "postAuthorHeadline, postAuthorAvatar, postDate, " +
            "postMediaUrl, postMediaType, postReactions, postComments, " +
            "postShares. For comments under one post use " +
            "mindcase#linkedin/post-comments; for what the member reacted " +
            "to use mindcase#linkedin/profile-reactions. $0.002 per " +
            "comment plus a flat $0.001 search fee per run, charged even " +
            "when nothing is found.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/profile-comments",
        categories: ["linkedin"],
        notes: [
            "Adds a flat $0.001 search fee to every run, including runs " +
            "that find nothing.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/profile-comments",
    request: { method: "POST", path: "/v1/data/linkedin/profile-comments/run" },
    input: {
        schema: {
            body: zLinkedinProfileCommentsBody.extend({
                maxResults: zLinkedinProfileCommentsBody.shape.maxResults
                    .unwrap().min(1).describe(
                        "Number of comments to return. Required, at least 1.",
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
                    label: "comments",
                    description: "comments returned",
                    consumes: { credit: "default", amount: 0.002 },
                },
                search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search fee",
                    description:
                        "one flat fee per run, charged even when nothing is found",
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { row: rows, search: 1 } };
        },
        evidence: ({ data, utils }) => {
            const input = (data.input.body ?? {}) as Record<string, unknown>;
            // deno-lint-ignore no-explicit-any
            const body = (input.params ?? input) as any;
            const delivered = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return { counts: { row: delivered, search: 1 } };
        },
    },
});
