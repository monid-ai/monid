import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokDownloadBody } from "./schema/inputs.ts";

/**
 * Mindcase `tiktok/download`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Download",
        summary: "Download links for TikTok videos, with video ID, author, " +
            "caption, posted date and duration. Pass the video URLs.",
        description:
            "Download links for TikTok videos, with video ID, author, " +
            "caption, posted date and duration. Pass the video URLs. " +
            "Returns one row per download with postUrl, videoId, author, " +
            "caption, postedDate, durationS, downloadUrl, " +
            "downloadUrlExpiresAt, fileSizeBytes, resolution, videoWidth, " +
            "videoHeight, isSlideshow, photoSlideshowImageUrls, " +
            "thumbnail, audioUrl, sound, views, likes, comments, shares, " +
            "saves, country, hashtags, mentions. For engagement data use " +
            "mindcase#tiktok/posts. $0.005 per download; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/tiktok/download",
        categories: ["tiktok"],
    },
    endpoint: "/tiktok/download",
    request: { method: "POST", path: "/v1/data/tiktok/download/run" },
    input: {
        schema: {
            body: zTiktokDownloadBody,
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
            const capped = body.urls.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
