import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { type VideoModel, zModel, zSameSizeBody } from "../../schema/video.ts";

const MODELS: VideoModel[] = [
    {
        id: "hyp-1",
        label: "Hyperion, adjustable with a PQ or HLG transfer function",
    },
    {
        id: "hyp-2",
        label:
            "Hyperion 2, fully automatic with richer color and detail, about 8x the credits",
    },
];

const zBody = zSameSizeBody.extend({
    model: zModel(MODELS, "hyp-1"),
    transfer_function: z.enum(["hlg", "pq"]).describe(
        "hyp-1 only: HDR transfer function — hlg for broadcast and " +
            "display, pq for mastering and cinematic delivery. Default hlg.",
    ).default("hlg"),
});

/** POST /video/express as `video/sdr-to-hdr`. */
export default defineEndpoint({
    meta: {
        displayName: "Convert Video from SDR to HDR",
        summary: "Convert SDR video into 10-bit HDR with expanded highlights " +
            "and shadows.",
        description: "Turn standard-dynamic-range footage, including 8-bit " +
            "AI-generated video, into HDR by redistributing luminance and " +
            "color across highlights, midtones and shadows. Returns a " +
            "7-day download URL for a 10-bit H265 MP4 plus the output " +
            "frame count, frame rate and size. Supports Hyperion " +
            "(default, HLG or PQ transfer function) and the automatic " +
            "Hyperion 2, an optional output size, and keeping the audio " +
            "track. Suited for: HDR deliverables for modern displays, " +
            "grading pipelines.",
        docsUrl:
            "https://developer.topazlabs.com/video-models/video-utilities/hyperion-sdr-to-hdr",
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
            "The output is 10-bit H265 (Main10); the HDR effect is only " +
            "visible on an HDR display.",
            "Deinterlace interlaced sources first; HDR conversion works " +
            "best on clean progressive video.",
            "Credits for a 10-second 30 fps clip: hyp-1 ~3 (1080p) / ~6 " +
            "(4K); hyp-2 ~24 (1080p) / ~50 (4K). Longer clips scale with " +
            "the frame count.",
        ],
    },
    endpoint: "/video/sdr-to-hdr",
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
                    filters: [{
                        model: body.model,
                        ...(body.model === "hyp-1"
                            ? { transferFunction: body.transfer_function }
                            : {}),
                    }],
                    output: {
                        resolution: {
                            width: body.output_width ?? body.width,
                            height: body.output_height ?? body.height,
                        },
                        frameRate: body.frame_rate,
                        audioTransfer: keepAudio ? "Copy" : "None",
                        ...(keepAudio ? { audioCodec: "AAC" } : {}),
                        videoEncoder: "H265",
                        videoProfile: "Main10",
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
                "hyp-1": [100, 50],
                "hyp-2": [13, 6],
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
