import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Profiles",
        summary:
            "Find TikTok accounts by keyword: handle, display name, bio, " +
            "follower and engagement counts, verification, and " +
            "business/seller info.",
        description:
            "Find TikTok accounts by keyword: handle, display name, bio, " +
            "follower and engagement counts, verification, and " +
            "business/seller info. Returns one row per profile with " +
            "profileUrl, handle, displayName, avatar, bio, bioLink, " +
            "verified, followers, following, mutualFollows, totalLikes, " +
            "likesGiven, videos, businessAccount, businessCategory, " +
            "tiktokSeller, private, accountCreated, tiktokId. For a " +
            "creator's videos use mindcase#tiktok/posts; for followers " +
            "use mindcase#tiktok/followers. $0.0025 per profile; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/profiles",
        categories: ["tiktok"],
        notes: [
            "`maxProfilesPerQuery` caps rows per input, so a run can " +
            "return up to that many rows for each `searchQueries` entry.",
            "`maxProfilesPerQuery` must be at least 1 here; the raw API " +
            "reads 0 or blank as unlimited, which cannot be priced up " +
            "front.",
        ],
    },
    endpoint: "/tiktok/profiles",
    request: { method: "POST", path: "/v1/data/tiktok/profiles/run" },
    input: {
        schema: {
            body: zTiktokProfilesBody.extend({
                maxProfilesPerQuery: zTiktokProfilesBody.shape
                    .maxProfilesPerQuery.unwrap().min(1).describe(
                        "Number of profiles to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0025 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped =
                body.searchQueries.split("\n").filter((line: string) =>
                    line.trim() !== ""
                ).length;
            const rows = body.maxProfilesPerQuery * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
