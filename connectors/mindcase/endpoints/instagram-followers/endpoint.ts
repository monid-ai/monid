import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramFollowersBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/followers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Followers & Following",
        summary: "Extract the followers or following list of any public " +
            "Instagram account: handle, name, verification, and privacy.",
        description: "Extract the followers or following list of any public " +
            "Instagram account: handle, name, verification, and privacy. " +
            "Returns one row per profile with username, profileUrl, " +
            "instagramUserId, fullName, verified, private, " +
            "profilePicture, sourceAccount. For full profiles of the " +
            "accounts use mindcase#instagram/profiles. $0.00075 per " +
            "profile; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/followers",
        categories: ["instagram"],
        notes: [
            "`maxResults` must be at least 50 here; the raw API reads 0 " +
            "or blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/instagram/followers",
    request: { method: "POST", path: "/v1/data/instagram/followers/run" },
    input: {
        schema: {
            body: zInstagramFollowersBody.extend({
                maxResults: zInstagramFollowersBody.shape.maxResults.unwrap()
                    .min(50).describe(
                        "Number of profiles to return (50–500,000). Required, at least 50.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.00075 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
