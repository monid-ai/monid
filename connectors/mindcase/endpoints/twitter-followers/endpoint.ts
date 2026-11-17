import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitterFollowersBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitter/followers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitter / X Followers",
        summary: "A Twitter (X) account's followers or following as full " +
            "profiles: bio, counts, location, links, account age and " +
            "latest tweet. From a handle or URL.",
        description: "A Twitter (X) account's followers or following as full " +
            "profiles: bio, counts, location, links, account age and " +
            "latest tweet. From a handle or URL. Returns one row per " +
            "profile with username, profileUrl, displayName, accountId, " +
            "bio, website, bioLinks, location, followers, followingCount, " +
            "tweets, mediaPosts, likesGiven, listedCount, protected, " +
            "accountCreated, pinnedTweetUrl, profilePicture, coverImage, " +
            "followedHandle, latestTweet. For one account's own profile " +
            "use mindcase#twitter/profiles. $0.00025 per profile; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitter/followers",
        categories: ["twitter"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/twitter/followers",
    request: { method: "POST", path: "/v1/data/twitter/followers/run" },
    input: {
        schema: {
            body: zTwitterFollowersBody.extend({
                maxResults: zTwitterFollowersBody.shape.maxResults.unwrap().min(
                    1,
                ).describe(
                    "Number of profiles to return. Required, at least 1.",
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.00025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
