import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { type VideoModel, zModel, zSameSizeBody } from "../../schema/video.ts";

const MODELS: VideoModel[] = [
    { id: "nyx-3", label: "Nyx, balanced denoise with natural texture" },
    {
        id: "nxhf-1",
        label: "Nyx High Fidelity, denoise only, no upscaling, maximum detail",
    },
    { id: "nxl-1", label: "Nyx XL, strongest denoise for very noisy footage" },
    { id: "nxf-1", label: "Nyx Fast, half price, no upscaling" },
];

const zBody = zSameSizeBody.extend({
    model: zModel(MODELS, "nyx-3"),
});

/** POST /video/express as `video/denoise`. */
export default defineEndpoint({
    meta: {
        displayName: "Denoise Video",
        summary: "Remove sensor noise and grain from video while preserving " +
            "fine texture.",
        description:
            "Clean low-light, high-ISO and heavily compressed footage of " +
            "noise and grain without smearing detail — pure noise " +
            "reduction with no sharpening or creative change. Returns a " +
            "7-day download URL for the MP4 plus the output frame count, " +
            "frame rate and size. Supports Nyx (balanced), Nyx XL " +
            "(strongest), Nyx High Fidelity (denoise only, for finishing " +
            "pipelines), Nyx Fast (half price), an optional output size " +
            "(nyx-3 and nxl-1 can upscale), and keeping the audio track. " +
            "Suited for: night and indoor footage, pre-processing before " +
            "color grading.",
        docsUrl: "https://developer.topazlabs.com/video-models/denoise",
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
            "nxhf-1 and nxf-1 cannot upscale: leave the output size at " +
            "the source.",
            "Credits for a 10-second 30 fps clip: nyx-3 ~1 (1080p) / ~3 " +
            "(4K); nxhf-1 ~3 (1080p) / ~6 (4K); nxl-1 ~3 (1080p) / ~6 " +
            "(4K); nxf-1 ~2 (1080p) / ~3 (4K). Longer clips scale with " +
            "the frame count.",
        ],
    },
    endpoint: "/video/denoise",
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
                "nyx-3": [518, 129],
                "nxhf-1": [100, 50],
                "nxl-1": [100, 50],
                "nxf-1": [200, 100],
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
