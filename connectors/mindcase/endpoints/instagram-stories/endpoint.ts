import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramStoriesBody } from "./schema/inputs.ts";

/**
 * Mindcase `instagram/stories`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram Stories",
        summary: "Extract a public Instagram account's currently-active " +
            "Stories (media URLs, timestamps, links, music, and poster " +
            "details) by username.",
        description: "Extract a public Instagram account's currently-active " +
            "Stories (media URLs, timestamps, links, music, and poster " +
            "details) by username. Returns one row per storie with " +
            "storyId, shortcode, username, profileUrl, fullName, " +
            "isVerified, mediaType, imageUrl, videoUrl, videoDuration, " +
            "hasAudio, width, height, takenAt, expiringAt, " +
            "isPaidPartnership, linkUrl, linkTitle, musicTitle, " +
            "musicArtist, posterProfilePic. Look up the currently-active " +
            "Stories for one or more public accounts by username or " +
            "profile URL. For saved story highlights use " +
            "mindcase#instagram/highlights; for posts and reels use " +
            "mindcase#instagram/posts. $0.01 per storie; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/instagram/stories",
        categories: ["instagram"],
    },
    endpoint: "/instagram/stories",
    request: { method: "POST", path: "/v1/data/instagram/stories/run" },
    input: {
        schema: {
            body: zInstagramStoriesBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.usernames.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
