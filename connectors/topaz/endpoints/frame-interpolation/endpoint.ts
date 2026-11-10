import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { type VideoModel, zModel, zSameSizeBody } from "../../schema/video.ts";

const MODELS: VideoModel[] = [
    {
        id: "apo-8",
        label: "Apollo, the default for smooth slow motion and exact 2x/4x/8x",
    },
    { id: "apf-2", label: "Apollo Fast, simpler motion at half the credits" },
    { id: "chr-2", label: "Chronos, fast action and layered motion" },
    { id: "chf-3", label: "Chronos Fast, half the credits" },
    { id: "aion-1", label: "Aion, extreme slow motion and heavy parallax" },
];

const zBody = zSameSizeBody.extend({
    model: zModel(MODELS, "apo-8"),
    slowmo: z.number().int().min(1).max(16).describe(
        "Slow-motion factor: 2 makes the clip twice as long at the same " +
            "frame rate. Default 1 (no slow motion).",
    ).default(1),
    fps: z.number().min(15).max(240).describe(
        "Target frame rate, e.g. 60 to convert 30 fps to 60 fps. " +
            "Default: the source frame rate. Combines with slowmo.",
    ).optional(),
    duplicate: z.boolean().describe(
        "Detect and drop duplicate source frames before interpolating. " +
            "Default false.",
    ).default(false),
});

/** POST /video/express as `video/frame-interpolation`. */
export default defineEndpoint({
    meta: {
        displayName: "Slow Motion and Frame Rate Conversion",
        summary: "Create slow motion or change a video's frame rate by " +
            "generating new frames.",
        description:
            "Generate the in-between frames for smooth slow motion (2x to " +
            "16x) or a frame-rate conversion (e.g. 24 to 60 fps) with " +
            "motion-aware interpolation instead of duplicated frames. " +
            "Returns a 7-day download URL for the MP4 plus the output " +
            "frame count, frame rate and duration. Supports Apollo " +
            "(default) and Chronos with half-price Fast variants, Aion " +
            "for extreme slow motion, duplicate-frame removal, and " +
            "keeping the audio track. Suited for: sports and action slow " +
            "motion, 60 fps deliverables, smoothing choppy AI-generated " +
            "clips.",
        docsUrl:
            "https://developer.topazlabs.com/video-models/frame-interpolation/apollo",
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
            "Not an upscaler: leave the output size at the source.",
            "Slow motion multiplies the duration; the audio track is " +
            "stretched by Topaz.",
            "Credits scale with the NEW frames generated: 2 per gigapixel " +
            "of new frames on Apollo/Chronos/Aion, 1 on the Fast models. " +
            "A 10-second 30 fps 1080p clip at 2x slow motion is about 1-2 " +
            "credits, at 4K about 5.",
        ],
    },
    endpoint: "/video/frame-interpolation",
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
                        slowmo: body.slowmo,
                        fps: body.fps ?? body.frame_rate,
                        duplicate: body.duplicate,
                    }],
                    output: {
                        resolution: {
                            width: body.output_width ?? body.width,
                            height: body.output_height ?? body.height,
                        },
                        frameRate: body.fps ?? body.frame_rate,
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
        /** Credits per gigapixel of NEW frames: 2 on Apollo, Chronos and
         *  Aion, 1 on the Fast models; at least 1. */
        estimate: ({ data }) => {
            const body = data.input.body!;
            const rate = body.model === "apf-2" || body.model === "chf-3"
                ? 1
                : 2;
            const fps = body.fps ?? body.frame_rate;
            const generated = Math.max(
                0,
                body.frame_count * body.slowmo * (fps / body.frame_rate) -
                    body.frame_count,
            );
            const pixels = (body.output_width ?? body.width) *
                (body.output_height ?? body.height);
            return {
                counts: {
                    "CREDIT": Math.max(
                        1,
                        Math.ceil(generated * pixels / 1e9 * rate),
                    ),
                },
            };
        },
    },
});
