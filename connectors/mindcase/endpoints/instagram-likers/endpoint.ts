import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramLikersBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/likers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Likers",
        summary: "Accounts that liked an Instagram post, with user ID, full " +
            "name, verified and private flags and profile picture. Pass " +
            "the post URLs.",
        description:
            "Accounts that liked an Instagram post, with user ID, full " +
            "name, verified and private flags and profile picture. Pass " +
            "the post URLs. Returns one row per liker with username, " +
            "profileUrl, instagramUserId, fullName, verified, private, " +
            "profilePicture, postUrl. For comment text use " +
            "mindcase#instagram/comments; for full profiles of the likers " +
            "use mindcase#instagram/profiles. $0.0015 per liker; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/likers",
        categories: ["instagram"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/instagram/likers",
    request: { method: "POST", path: "/v1/data/instagram/likers/run" },
    input: {
        schema: {
            body: zInstagramLikersBody.extend({
                maxResults: zInstagramLikersBody.shape.maxResults.unwrap().min(
                    1,
                ).default(100).describe("How many likers to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0015 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
