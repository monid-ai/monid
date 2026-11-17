import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookReelsBody } from "./schema/inputs.ts";

/**
 * Mindcase `facebook/reels`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Facebook Reels",
        summary: "Reels from public Facebook pages, with play count, publish " +
            "time, audio track, video and thumbnail links, languages. " +
            "Plays are the only engagement metric.",
        description:
            "Reels from public Facebook pages, with play count, publish " +
            "time, audio track, video and thumbnail links, languages. " +
            "Plays are the only engagement metric. Returns one row per " +
            "reel with reelUrl, reelId, page, plays, playsLabel, " +
            "publishedAt, durationSec, dimensions, videoUrl, " +
            "thumbnailUrl, audioTitle, audioArtist, audioTrack, " +
            "audioType, audioTrackId, remixable, audioMuted, " +
            "captionLanguages, captionsFileUrl, dubbedAudioLanguages, " +
            "error, errorDescription. For all posts use " +
            "mindcase#facebook/posts. $0.005 per reel; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/facebook/reels",
        categories: ["facebook"],
        notes: [
            "`maxReels` caps rows per input, so a run can return up to " +
            "that many rows for each `startUrls` entry.",
            "`maxReels` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/facebook/reels",
    request: { method: "POST", path: "/v1/data/facebook/reels/run" },
    input: {
        schema: {
            body: zFacebookReelsBody.extend({
                maxReels: zFacebookReelsBody.shape.maxReels.unwrap().min(1)
                    .describe(
                        "Number of reels to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.005 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.startUrls.split("\n").filter((line: string) =>
                line.trim() !== ""
            ).length;
            const rows = body.maxReels * Math.max(1, capped);
            return { counts: { RESULT: rows } };
        },
    },
});
