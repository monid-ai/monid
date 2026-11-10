import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { type VideoModel, zModel, zUpscaleBody } from "../../schema/video.ts";

const MODELS: VideoModel[] = [
    { id: "ghq-5", label: "Gaia High Quality, clean CG renders" },
    { id: "gcg-5", label: "Gaia CG, animation, linework and stylized imagery" },
    {
        id: "ganim-1",
        label:
            "Gaia 2, frame-by-frame 2x for hand-drawn and stop-motion animation, half price",
    },
];

const zBody = zUpscaleBody.extend({
    model: zModel(MODELS, "gcg-5"),
});

/** POST /video/express as `video/upscale-animation`. */
export default defineEndpoint({
    meta: {
        displayName: "Upscale Animation and CG Video",
        summary: "Upscale animation, CGI or motion graphics without blurring " +
            "lines or frames.",
        description: "Increase the resolution of clean animated or rendered " +
            "sources — traditional and stop-motion animation, motion " +
            "graphics, game captures and CG renders — preserving crisp " +
            "lines and the intended look. Returns a 7-day download URL " +
            "for the MP4 plus the output frame count, frame rate and " +
            "size. Supports Gaia HQ for renders, Gaia CG for stylized " +
            "art, Gaia 2 for frame-independent 2x animation upscaling, " +
            "any output size, and keeping the audio track. Suited for: " +
            "remastering cartoons and game footage, upscaling rendered " +
            "previews.",
        docsUrl: "https://developer.topazlabs.com/video-models/proteus/gaia",
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
            "ganim-1 only upscales 2x and processes frames independently " +
            "(no temporal blending).",
            "Credits for a 10-second 30 fps clip: ghq-5 ~3 (1080p) / ~6 " +
            "(4K); gcg-5 ~3 (1080p) / ~6 (4K); ganim-1 ~1 (1080p) / ~3 " +
            "(4K). Longer clips scale with the frame count.",
        ],
    },
    endpoint: "/video/upscale-animation",
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
                "ghq-5": [100, 50],
                "gcg-5": [100, 50],
                "ganim-1": [300, 100],
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
