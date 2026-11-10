import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zUpscaleBody } from "../../schema/video.ts";

const zBody = zUpscaleBody.extend({
    creativity: z.number().min(0).max(1).describe(
        "How much new detail and texture the model invents (0.0-1.0). " +
            "Default 0.",
    ).default(0),
    realism: z.number().min(0).max(1).describe(
        "How photographic the invented detail looks (0.0-1.0). Default 0.",
    ).default(0),
    sharp: z.number().min(0).max(1).describe(
        "Pre-enhance sharpness: 0.0 blurs the source first, 0.5 leaves " +
            "it as is, 1.0 sharpens it. Default 0.5.",
    ).default(0.5),
    prompt: z.string().max(1000).describe(
        'Optional text guiding the new detail, e.g. "crisp fur, soft ' +
            'afternoon light".',
    ).optional(),
});

/** POST /video/express as `video/upscale-creative`. */
export default defineEndpoint({
    meta: {
        displayName: "Upscale Video with Creative Detail",
        summary: "Upscale AI-generated video to 4K, inventing new detail " +
            "guided by a prompt.",
        description:
            "Transform stylized or AI-generated video while upscaling it " +
            "to HD or 4K: a creative diffusion model adds new, dynamic " +
            "detail and texture, with dials for creativity, realism and " +
            "sharpness and an optional text prompt steering what it " +
            "invents. Returns a 7-day download URL for the MP4 plus the " +
            "output frame count, frame rate and size. Supports any output " +
            "size and keeping the audio track. Suited for: GenAI clips " +
            "that look soft or plastic, wide shots and detail-sparse " +
            "scenes; not for footage that must stay faithful.",
        docsUrl: "https://developer.topazlabs.com/video-models/astra/astra-2",
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
            "Creative models can change objects, identity and style; use " +
            "/video/upscale-generative to stay faithful to the source.",
            "Jobs queue upstream before processing (20 minutes observed). " +
            "The run times out after 30 minutes at no charge; retry later " +
            "if that happens.",
            "Credits for a 10-second 30 fps clip: ast-2 ~30 (1080p) / ~50 " +
            "(4K). Longer clips scale with the frame count.",
        ],
    },
    endpoint: "/video/upscale-creative",
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
                        model: "ast-2",
                        creativity: body.creativity,
                        realism: body.realism,
                        sharp: body.sharp,
                        ...(body.prompt !== undefined
                            ? { prompt: body.prompt }
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
                "ast-2": [10, 6],
            } as Record<string, number[]>;
            const width = body.output_width ?? body.width;
            const height = body.output_height ?? body.height;
            const uhd = Math.max(width, height) > 1920 ||
                Math.min(width, height) > 1080;
            const rate = rates["ast-2"][uhd ? 1 : 0];
            return {
                counts: {
                    "CREDIT": Math.max(1, Math.ceil(body.frame_count / rate)),
                },
            };
        },
    },
});
