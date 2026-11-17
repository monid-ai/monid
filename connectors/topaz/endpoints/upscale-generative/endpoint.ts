import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { type VideoModel, zModel, zUpscaleBody } from "../../schema/video.ts";

const MODELS: VideoModel[] = [
    {
        id: "slp-2.6",
        label:
            "Starlight Precise 2.6, the latest all-round model with a sharpness dial",
    },
    { id: "slp-2.5", label: "Starlight Precise 2.5, the previous release" },
    {
        id: "slhq-1",
        label:
            "Starlight HQ, maximum quality for clean modern high-resolution sources",
    },
    {
        id: "slm-1",
        label:
            "Starlight Mini, restoration for 8mm/16mm film, MiniDV and interlaced tapes",
    },
    {
        id: "wonder-1",
        label:
            "Starlight Sharp, sharper detail and small faces in low-res progressive video",
    },
    {
        id: "slf-2",
        label: "Starlight Fast 2, twice as fast at half the credits",
    },
];

const zBody = zUpscaleBody.extend({
    model: zModel(MODELS, "slp-2.6"),
    sharpness: z.number().min(1).max(5).describe(
        "slp-2.6 only: how much sharpening to apply (1.0 softest to 5.0 " +
            "sharpest). Default 5.0.",
    ).optional(),
});

/** POST /video/express as `video/upscale-generative`. */
export default defineEndpoint({
    meta: {
        displayName: "Upscale Video with Realistic Detail",
        summary:
            "Upscale video to 4K with restored realistic faces, textures " +
            "and text.",
        description:
            "Generative upscaling that improves realism while preserving " +
            "the source's intent — natural faces and skin, fabric and " +
            "material texture, legible text and logos, stable across long " +
            "sequences. Works on AI-generated video and on archival " +
            "footage from film, tape or early digital cameras. Returns a " +
            "7-day download URL for the MP4 plus the output frame count, " +
            "frame rate and size. Supports Precise 2.6 (default, with a " +
            "sharpness dial), HQ for clean modern sources, Mini for " +
            "degraded film and tape, Sharp for blurry low-res clips, Fast " +
            "2 at half the credits, any output size, and keeping the " +
            "audio track. Suited for: polishing GenAI output, restoring " +
            "archives to HD/4K.",
        docsUrl:
            "https://developer.topazlabs.com/video-models/starlight/starlight-precise-2.6",
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
            "Jobs may queue upstream before processing. The run times out " +
            "after 30 minutes at no charge; retry later if that happens.",
            "sharpness only applies to slp-2.6 and is ignored on other " +
            "models.",
            "Credits for a 10-second 30 fps clip: slp-2.6 ~12 (1080p) / " +
            "~26 (4K); slp-2.5 ~12 (1080p) / ~26 (4K); slhq-1 ~12 (1080p) " +
            "/ ~26 (4K); slm-1 ~12 (1080p) / ~26 (4K); wonder-1 ~12 " +
            "(1080p) / ~26 (4K); slf-2 ~6 (1080p) / ~13 (4K). Longer " +
            "clips scale with the frame count.",
        ],
    },
    endpoint: "/video/upscale-generative",
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
                        ...(body.model === "slp-2.6" &&
                                body.sharpness !== undefined
                            ? { sharpness: body.sharpness }
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
                "slp-2.6": [26.0417, 11.9179],
                "slp-2.5": [26.0417, 11.9179],
                "slhq-1": [26.0417, 11.9179],
                "slm-1": [26.0417, 11.9179],
                "wonder-1": [26.0417, 11.9179],
                "slf-2": [52.0833, 23.8357],
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
