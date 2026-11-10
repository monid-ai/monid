import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { type VideoModel, zModel, zUpscaleBody } from "../../schema/video.ts";

const MODELS: VideoModel[] = [
    { id: "ahq-12", label: "Artemis High Quality, for clean sources" },
    { id: "alqs-2", label: "Artemis Medium Quality, for average sources" },
    { id: "alq-13", label: "Artemis Low Quality, for degraded sources" },
    { id: "amqs-2", label: "Artemis Medium Halo, removes light edge halos" },
    { id: "amq-13", label: "Artemis Strong Halo, removes heavy edge halos" },
    {
        id: "aaa-9",
        label: "Artemis Aliasing / Moire, removes jagged edges and moire",
    },
];

const zBody = zUpscaleBody.extend({
    model: zModel(MODELS, "alqs-2"),
});

/** POST /video/express as `video/fix-artifacts`. */
export default defineEndpoint({
    meta: {
        displayName: "Upscale and Fix Video Artifacts",
        summary: "Upscale video while removing noise, compression halos, " +
            "aliasing or moire.",
        description:
            "Remove compression artifacts, edge halos, aliasing and moire " +
            "while upscaling — pick the Artemis variant that matches the " +
            "source quality (high, medium, low) or its specific defect " +
            "(halo, moire). Returns a 7-day download URL for the MP4 plus " +
            "the output frame count, frame rate and size. Supports any " +
            "output size and keeping the audio track. Suited for: " +
            "cleaning up over-sharpened or web-compressed footage before " +
            "delivery.",
        docsUrl: "https://developer.topazlabs.com/video-models/proteus/artemis",
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
            "Credits for a 10-second 30 fps clip: ahq-12 ~3 (1080p) / ~6 " +
            "(4K); alqs-2 ~3 (1080p) / ~6 (4K); alq-13 ~3 (1080p) / ~6 " +
            "(4K); amqs-2 ~3 (1080p) / ~6 (4K); amq-13 ~3 (1080p) / ~6 " +
            "(4K); aaa-9 ~3 (1080p) / ~6 (4K). Longer clips scale with " +
            "the frame count.",
        ],
    },
    endpoint: "/video/fix-artifacts",
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
                "ahq-12": [100, 50],
                "alqs-2": [100, 50],
                "alq-13": [100, 50],
                "amqs-2": [100, 50],
                "amq-13": [100, 50],
                "aaa-9": [100, 50],
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
