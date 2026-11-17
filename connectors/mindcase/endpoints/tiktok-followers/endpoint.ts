import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokFollowersBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/followers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Followers & Following",
        summary: "The followers or following list of any public TikTok " +
            "account, each row a full profile with handle, name, " +
            "followers, likes, video count and bio.",
        description: "The followers or following list of any public TikTok " +
            "account, each row a full profile with handle, name, " +
            "followers, likes, video count and bio. Returns one row per " +
            "profile with profileUrl, handle, displayName, " +
            "connectionType, connectedAccount, bio, followers, following, " +
            "totalLikes, videos, verified, private, tiktokSeller, " +
            "mutualFollows, likesGiven, avatar, userId. For one creator's " +
            "own stats use mindcase#tiktok/profiles. $0.001 per profile; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/followers",
        categories: ["tiktok"],
        notes: [
            "`maxFollowersPerProfile` must be at least 1 here; the raw " +
            "API reads 0 or blank as unlimited, which cannot be priced up " +
            "front.",
        ],
    },
    endpoint: "/tiktok/followers",
    request: { method: "POST", path: "/v1/data/tiktok/followers/run" },
    input: {
        schema: {
            body: zTiktokFollowersBody.extend({
                maxFollowersPerProfile: zTiktokFollowersBody.shape
                    .maxFollowersPerProfile.unwrap().min(1).describe(
                        "Number of followers to return (accounts that follow the target). Required, at least 1.",
                    ),
                maxFollowingPerProfile: zTiktokFollowersBody.shape
                    .maxFollowingPerProfile.unwrap().default(0),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.profiles.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = capped *
                (body.maxFollowersPerProfile + body.maxFollowingPerProfile);
            return { counts: { RESULT: rows } };
        },
    },
});
