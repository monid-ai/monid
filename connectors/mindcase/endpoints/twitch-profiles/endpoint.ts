import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTwitchProfilesBody } from "./schema/inputs.ts";

/**
 * Mindcase `twitch/profiles`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Twitch Profiles",
        summary: "Twitch channel profiles with display name, bio, follower " +
            "count and partner status. Pass the channels.",
        description:
            "Twitch channel profiles with display name, bio, follower " +
            "count and partner status. Pass the channels. Returns one row " +
            "per profile with twitchId, profileUrl, handle, displayName, " +
            "bio, followers, partner, affiliate, live, liveViewers, " +
            "streamTitle, streamGame, streamStarted, lastStreamTitle, " +
            "lastStreamGame, lastStreamDate, avatar, banner, " +
            "accountCreated. For clips use mindcase#twitch/clips. $0.0045 " +
            "per profile; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/twitch/profiles",
        categories: ["social-media"],
    },
    endpoint: "/twitch/profiles",
    request: { method: "POST", path: "/v1/data/twitch/profiles/run" },
    input: {
        schema: {
            body: zTwitchProfilesBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0045 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.channels.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
