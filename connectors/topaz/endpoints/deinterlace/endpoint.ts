import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { type VideoModel, zModel, zUpscaleBody } from "../../schema/video.ts";

const MODELS: VideoModel[] = [
    { id: "dtv-4", label: "Dione TV, interlaced broadcast footage" },
    { id: "ddv-3", label: "Dione DV, interlaced camcorder footage" },
    { id: "dtd-4", label: "Dione Robust, interlaced and heavily degraded" },
    { id: "dtvs-2", label: "Dione Dehalo, interlaced with light halos" },
    {
        id: "dtds-2",
        label: "Dione Robust Dehalo, interlaced and degraded with halos",
    },
];

const zBody = zUpscaleBody.extend({
    model: zModel(MODELS, "dtv-4"),
});

/** POST /video/express as `video/deinterlace`. */
export default defineEndpoint({
    meta: {
        displayName: "Deinterlace and Upscale Old Footage",
        summary: "Deinterlace interlaced TV, camcorder or DVD video and " +
            "upscale it to HD or 4K.",
        description:
            "Convert interlaced sources (480i, 576i, 1080i broadcast, DV " +
            "camcorder tapes, DVDs) into clean progressive video and " +
            "upscale them in one pass. Returns a 7-day download URL for " +
            "the MP4 plus the output frame count, frame rate and size. " +
            "Supports variants for TV, DV, heavily degraded and haloed " +
            "sources, any output size, and keeping the audio track. " +
            "Suited for: digitized tape and broadcast archives, DVD " +
            "remasters.",
        docsUrl: "https://developer.topazlabs.com/video-models/proteus/dione",
        categories: ["video-enhancement"],
        notes: [
            "Topaz downloads video_url itself: the link must be publicly " +
            "reachable and its path must end with a video extension.",
            "frame_count, frame_rate, width and height describe the " +
            "SOURCE; Topaz verifies them after download and fails the job " +
            "(no charge) if they are far off.",
            "The completed run returns destination.download.url (MP4) — " +
            "the link EXPIRES after 7 days, download promptly.",
            "Stopping a running job cancels it upstream; a canceled job " +
            "delivers no output.",
            "Credits for a 10-second 30 fps clip: dtv-4 ~3 (1080p) / ~6 " +
            "(4K); ddv-3 ~3 (1080p) / ~6 (4K); dtd-4 ~3 (1080p) / ~6 " +
            "(4K); dtvs-2 ~3 (1080p) / ~6 (4K); dtds-2 ~3 (1080p) / ~6 " +
            "(4K). Longer clips scale with the frame count.",
        ],
    },
    endpoint: "/video/deinterlace",
    request: { method: "POST", path: "/video/express" },
    input: {
        schema: { body: zBody },
        toRequest: ({ data }) => {
            const body = data.input.body as Record<string, Json>;
            const url = String(body.video_url);
            const path = url.split(/[?#]/)[0];
            const keepAudio = body.keep_audio !== false;
            return {
                ...data.input,
                body: {
                    source: {
                        container: path.slice(path.lastIndexOf(".") + 1)
                            .toLowerCase(),
                        frameCount: body.frame_count,
                        frameRate: body.frame_rate,
                        resolution: { width: body.width, height: body.height },
                        external: { provider: "s3", presignedUrl: url },
                    },
                    filters: [{ model: body.model }],
                    output: {
                        resolution: {
                            width: body.output_width ?? body.width,
                            height: body.output_height ?? body.height,
                        },
                        frameRate: body.frame_rate,
                        audioTransfer: keepAudio ? "Copy" : "None",
                        ...(keepAudio ? { audioCodec: "AAC" } : {}),
                        videoEncoder: "H264",
                        videoProfile: "High",
                        container: "mp4",
                        // omitting it is a 500 upstream (monid-services drill)
                        dynamicCompressionLevel: "High",
                    },
                },
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "Topaz credits",
            consumes: { credit: "default", amount: 1 },
        },
        /** Frames per credit by model, at up to 1920x1080 / above it (the
         *  4K tier starts where the frame outgrows 1920x1080 in either
         *  orientation); frames ÷ rate, ceiled, at least 1. */
        estimate: ({ data }) => {
            const body = data.input.body!;
            const rates = {
                "dtv-4": [100, 50],
                "ddv-3": [100, 50],
                "dtd-4": [100, 50],
                "dtvs-2": [100, 50],
                "dtds-2": [100, 50],
            } as Record<string, number[]>;
            const width = body.output_width ?? body.width;
            const height = body.output_height ?? body.height;
            const uhd = Math.max(width, height) > 1920 ||
                Math.min(width, height) > 1080;
            const rate = rates[body.model][uhd ? 1 : 0];
            return {
                counts: {
                    "CREDIT": Math.max(1, Math.ceil(body.frame_count / rate)),
                },
            };
        },
    },
});
