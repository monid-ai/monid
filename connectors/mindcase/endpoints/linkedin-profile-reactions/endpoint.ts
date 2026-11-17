import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileReactionsBody } from "./schema/inputs.ts";

/**
 * Mindcase `linkedin/profile-reactions`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "LinkedIn Profile Reactions",
        summary: "Monitor public LinkedIn profiles for reactions, along with " +
            "full post details and social activities.",
        description:
            "Monitor public LinkedIn profiles for reactions, along with " +
            "full post details and social activities. Returns one row per " +
            "reaction with reaction, reactorUrl, reactorProfileId, " +
            "reactedAt, postUrl, postId, postText, postAuthor, " +
            "postAuthorUrl, postAuthorProfileId, postAuthorHandle, " +
            "postAuthorType, postAuthorHeadline, postDate, postMediaUrl, " +
            "postMediaType, postReactions, postComments, postShares. For " +
            "reactions on one post use mindcase#linkedin/post-reactions; " +
            "for what the member commented use " +
            "mindcase#linkedin/profile-comments. $0.002 per reaction; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/linkedin/profile-reactions",
        categories: ["linkedin"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/linkedin/profile-reactions",
    request: {
        method: "POST",
        path: "/v1/data/linkedin/profile-reactions/run",
    },
    input: {
        schema: {
            body: zLinkedinProfileReactionsBody.extend({
                maxResults: zLinkedinProfileReactionsBody.shape.maxResults
                    .unwrap().min(1).describe(
                        "Number of reactions to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
