import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Profiles",
        summary: "Extract Instagram account data (bio, followers, " +
            "verification, business info, links, and recent posts) by " +
            "username or keyword search.",
        description: "Extract Instagram account data (bio, followers, " +
            "verification, business info, links, and recent posts) by " +
            "username or keyword search. Returns one row per profile with " +
            "profileUrl, instagramId, username, fullName, bio, followers, " +
            "following, posts, verified, private, businessAccount, " +
            "businessCategory, businessStreet, businessCity, businessZip, " +
            "businessLatitude, businessLongitude, businessCityId, " +
            "bioLinks, profilePicture, highlightReels, lastPostDate, " +
            "recentPosts, relatedAccounts, facebookPage. Look up specific " +
            "accounts by username or URL, or search Instagram accounts by " +
            "keyword. For a profile's posts and reels use " +
            "mindcase#instagram/posts; for its follower list use " +
            "mindcase#instagram/followers. $0.002 per profile; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/profiles",
        categories: ["instagram"],
        notes: [
            "`maxResults` does not apply to `usernames`: those return one " +
            "row per entry.",
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/instagram/profiles",
    request: { method: "POST", path: "/v1/data/instagram/profiles/run" },
    input: {
        schema: {
            body: zInstagramProfilesBody.extend({
                maxResults: zInstagramProfilesBody.shape.maxResults.unwrap()
                    .min(1).describe(
                        "Number of profiles to return. Capped at 250. Required, at least 1.",
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
            const capped =
                (body.query ?? "").split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const uncapped = body.usernames?.length ?? 0;
            const rows = uncapped +
                (capped > 0 || uncapped === 0 ? body.maxResults : 0);
            return { counts: { RESULT: rows } };
        },
    },
});
