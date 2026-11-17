import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookFollowersBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/followers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Followers & Following",
        summary: "Profiles that follow a Facebook page, or that the page " +
            "follows, with name, profile URL, ID, avatar and bio. Choose " +
            "followers, following, or both.",
        description: "Profiles that follow a Facebook page, or that the page " +
            "follows, with name, profile URL, ID, avatar and bio. Choose " +
            "followers, following, or both. Returns one row per profile " +
            "with followerName, profileUrl, profileId, avatarUrl, bio, " +
            "relationship. Give a Facebook page URL or handle, choose " +
            "followers / following / both, and set how many profiles to " +
            "return in total. $0.0075 per profile; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/followers",
        categories: ["facebook"],
        notes: [
            "`limit` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/followers",
    request: { method: "POST", path: "/v1/data/facebook/followers/run" },
    input: {
        schema: {
            body: zFacebookFollowersBody.extend({
                limit: zFacebookFollowersBody.shape.limit.unwrap().min(1)
                    .describe(
                        "Number of profiles to return in total. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0075 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.limit;
            return { counts: { RESULT: rows } };
        },
    },
});
