import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinPostCommentsBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/post-comments`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Post Comments",
        summary:
            "Extract LinkedIn post comments and replies, including likes " +
            "and reactions, from a list of post URLs.",
        description:
            "Extract LinkedIn post comments and replies, including likes " +
            "and reactions, from a list of post URLs. Returns one row per " +
            "comment with commenterName, commenterHeadline, commenterUrl, " +
            "commenterProfileId, commenterHandle, commenterPhoto, " +
            "commenterType, commenterFollowers, isAuthor, comment, " +
            "commentUrl, commentedAt, commentReactions, commentId, " +
            "mentions, postUrl. For the posts themselves use " +
            "mindcase#linkedin/posts; for who reacted use " +
            "mindcase#linkedin/post-reactions. $0.002 per comment plus a " +
            "flat $0.001 search fee per run, charged even when nothing is " +
            "found.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/post-comments",
        categories: ["linkedin"],
        notes: [
            "Adds a flat $0.001 search fee to every run, including runs " +
            "that find nothing.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/post-comments",
    request: { method: "POST", path: "/v1/data/linkedin/post-comments/run" },
    input: {
        schema: {
            body: zLinkedinPostCommentsBody.extend({
                maxResults: zLinkedinPostCommentsBody.shape.maxResults.unwrap()
                    .min(1).describe(
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
