import { defineEndpoint } from "@shared/core";
import { zVidCrawlFramesBody } from "./schema/inputs.ts";

/**
 * `POST /v1/frames` — Layer 2 high-resolution frame extraction at target timestamps.
 */
export default defineEndpoint({
    meta: {
        displayName: "VidCrawl Video Frames",
        summary: "Extract up to 20 high-resolution JPEG frames at exact " +
            "video timestamps.",
        description: "Layer 2 targeted visual inspection. Pass a video URL " +
            "and 1 to 20 `timestamps_sec` values (typically spotted in a " +
            "vidcrawl#v1/scrape transcript or storyboard grid) to slice " +
            "sharp JPEG frames up to `max_width` pixels (320..1920, default " +
            "1280) without downloading an entire MP4. Returns base64 " +
            "`data_url`, dimensions, byte length, and `[MM:SS]` labels. " +
            "Flat 1 credit ($0.009 at Starter rate) per call regardless of " +
            "frame count (1..20).",
        docsUrl: "https://vidcrawl.com/api-reference",
        categories: ["youtube", "tiktok", "instagram", "twitter"],
        notes: [
            "Flat 1 credit ($0.009 at Starter rate) for 1 to 20 frames in one request.",
        ],
    },
    request: { method: "POST", path: "/v1/frames" },
    input: { schema: { body: zVidCrawlFramesBody } },
});
