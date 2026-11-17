import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitterRetweetersBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitter/retweeters`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitter / X Retweeters",
        summary: "Everyone who retweeted a tweet, each as a full Twitter (X) " +
            "profile with handle, name, bio, follower counts, " +
            "verification, location and links.",
        description:
            "Everyone who retweeted a tweet, each as a full Twitter (X) " +
            "profile with handle, name, bio, follower counts, " +
            "verification, location and links. Returns one row per " +
            "profile with username, profileUrl, displayName, accountId, " +
            "bio, website, bioLinks, location, followers, following, " +
            "tweets, mediaPosts, likesGiven, blueVerified, " +
            "legacyVerified, accountCreated, openDms, pinnedTweetUrl, " +
            "profilePicture, coverImage, sourceTweetUrl. For replies use " +
            "mindcase#twitter/replies. $0.00025 per profile; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitter/retweeters",
        categories: ["twitter"],
        notes: [
            "`max_items_per_tweet` caps rows per input, so a run can " +
            "return up to that many rows for each `tweet_ids` entry.",
            "`max_items_per_tweet` must be at least 1 here; the raw API " +
            "reads 0 or blank as unlimited, which cannot be priced up " +
            "front.",
        ],
    },
    endpoint: "/twitter/retweeters",
    request: { method: "POST", path: "/v1/data/twitter/retweeters/run" },
    input: {
        schema: {
            body: zTwitterRetweetersBody.extend({
                max_items_per_tweet: zTwitterRetweetersBody.shape
                    .max_items_per_tweet.unwrap().min(1).describe(
                        "Number of retweeter profiles to return. Required, at least 1.",
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
            const capped = body.tweet_ids.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = body.max_items_per_tweet * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
