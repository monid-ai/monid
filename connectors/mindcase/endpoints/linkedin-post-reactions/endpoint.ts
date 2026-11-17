import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinPostReactionsBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/post-reactions`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Post Reactions",
        summary: "Extract reactions from LinkedIn posts and comments, " +
            "providing likes and appreciations.",
        description: "Extract reactions from LinkedIn posts and comments, " +
            "providing likes and appreciations. Returns one row per " +
            "reaction with reactorName, reactorUrl, reactorProfileId, " +
            "reactorHandle, reactorHeadline, reactorPhoto, " +
            "reactorLocation, reactionType, postUrl, postUrn. For the " +
            "posts themselves use mindcase#linkedin/posts; for comment " +
            "text use mindcase#linkedin/post-comments. $0.002 per " +
            "reaction plus a flat $0.001 search fee per run, charged even " +
            "when nothing is found.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/post-reactions",
        categories: ["linkedin"],
        notes: [
            "Adds a flat $0.001 search fee to every run, including runs " +
            "that find nothing.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/post-reactions",
    request: { method: "POST", path: "/v1/data/linkedin/post-reactions/run" },
    input: {
        schema: {
            body: zLinkedinPostReactionsBody.extend({
                maxResults: zLinkedinPostReactionsBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Number of reactions to return. Required, at least 1.",
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
                    label: "reactions",
                    description: "reactions returned",
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
