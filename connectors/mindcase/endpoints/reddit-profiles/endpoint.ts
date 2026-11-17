import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `reddit/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Reddit Profiles",
        summary:
            "Reddit user profiles with display name, bio and total, post " +
            "and comment karma. Pass the usernames.",
        description:
            "Reddit user profiles with display name, bio and total, post " +
            "and comment karma. Pass the usernames. Returns one row per " +
            "profile with redditId, username, profileUrl, displayName, " +
            "bio, totalKarma, postKarma, commentKarma, created, premium, " +
            "verified, hasVerifiedEmail, employee, moderator, over18, " +
            "avatar, snoovatar, banner, previousNames. For their posts " +
            "use mindcase#reddit/posts. $0.0035 per profile; empty runs " +
            "cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/reddit/profiles",
        categories: ["reddit"],
    },
    endpoint: "/reddit/profiles",
    request: { method: "POST", path: "/v1/data/reddit/profiles/run" },
    input: {
        schema: {
            body: zRedditProfilesBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0035 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.usernames.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
