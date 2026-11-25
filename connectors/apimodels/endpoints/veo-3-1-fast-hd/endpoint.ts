import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zVeoFastBody } from "../../schema/media.ts";

/**
 * Veo 3.1 Fast HD — `model: "veo-3.1-fast-hd"` on apimodels'
 * `/v1/video/generations` task endpoint: fixed 8-second 720p clips, one
 * flat price per video. List price read 2026-11-25 from
 * https://apimodels.app/docs/google-veo.
 */
export default defineEndpoint({
    meta: {
        displayName: "Veo 3.1 Fast HD (apimodels)",
        summary:
            "Generate an 8-second 720p video with audio from text or first/last frames with Google's Veo 3.1 Fast: $0.08 per video.",
        description:
            "Text-to-video and image-to-video with Google's Veo 3.1 Fast at 720p through apimodels. " +
            "Strengths: a generated audio track with every clip, first-frame and first+last-frame control, one flat price of $0.08 per video. " +
            "Limits: every clip is exactly 8 seconds at 720p, aspect ratio 16:9 or 9:16 only, no reference images beyond the two frames. " +
            "Returns resultUrls (MP4, 30-day link). " +
            "Suited for: social clips, ad and product b-roll, storyboard previews, animating a still.",
        docsUrl: "https://apimodels.app/docs/google-veo",
        categories: ["video-generation"],
        notes: [
            "Duration is fixed at 8 seconds; there is no duration parameter.",
            "images takes [first frame] or [first frame, last frame]; a last frame needs a first frame before it.",
        ],
    },
    endpoint: "/v1/video/veo-3.1-fast-hd",
    request: { method: "POST", path: "/v1/video/generations" },
    input: {
        schema: { body: zVeoFastBody },
        /** Pin the model. */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "veo-3.1-fast-hd",
            }),
        }),
    },
    // a clip usually lands in 1-3 minutes
    timeouts: { runMs: 1_800_000, pollMs: 10_000 },
    usage: {
        /** One flat list price per delivered video. */
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.08 },
        },
    },
});
