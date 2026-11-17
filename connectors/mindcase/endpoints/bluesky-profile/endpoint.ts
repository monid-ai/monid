import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBlueskyProfileBody } from "./schema/inputs.ts";

/**
 * Mindcase `bluesky/profile`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Bluesky Profile",
        summary:
            "Bluesky profiles with handle, display name, bio and follower " +
            "and following counts. Pass the handles to look up.",
        description:
            "Bluesky profiles with handle, display name, bio and follower " +
            "and following counts. Pass the handles to look up. Returns " +
            "one row per profile with profileUrl, blueskyId, handle, " +
            "displayName, bio, followers, following, posts, verified, " +
            "trustedVerifier, labeler, accountCreated, bioLinks, " +
            "bioEmails, lists, feeds, starterPacks, dmsAllowedFrom, " +
            "pinnedPostUrl, profilePicture, coverImage. $0.0025 per " +
            "profile; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/bluesky/profile",
        categories: ["social-media"],
    },
    endpoint: "/bluesky/profile",
    request: { method: "POST", path: "/v1/data/bluesky/profile/run" },
    input: {
        schema: {
            body: zBlueskyProfileBody,
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
            const capped = body.handles.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
