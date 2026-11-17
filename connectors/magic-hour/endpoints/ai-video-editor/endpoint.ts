import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// API schema: Magic Hour OpenAPI at 2e0bbe9; price inputs: web-app at 595e4b9.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Video Editor",
        summary: "AI Video Editor",
        description:
            "AI Video Editor. Choose an explicit model and resolution for a credit estimate. Supported duration and output resolution depend on the model and plan. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
        notes: [
            "Model, resolution and clip-length combinations are validated by Magic Hour; Omni supports 720p or 1080p and clips of 3–10 seconds. LTX supports 480p, 720p or 1080p, with length limits varying by resolution.",
        ],
    },
    request: { method: "POST", path: "/v1/ai-video-editor" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your video a custom name for easy identification.",
                        )
                        .optional(),
                    start_seconds: z
                        .number()
                        .min(0)
                        .describe(
                            "Start time of your clip (seconds). Must be ≥ 0.",
                        )
                        .optional(),
                    end_seconds: z
                        .number()
                        .min(0.1)
                        .describe(
                            "End time of your clip in seconds. Must be greater than `start_seconds`. Minimum duration depends on model: `gemini-omni-1.1`: 3s, LTX 2.5: 0.5s. Maximum duration depends on model: `gemini-omni-1.1`: 10s, LTX 2.5: 60s (30s at 1080p).",
                        ),
                    model: z.enum([
                        "gemini-omni-1.1",
                        "ltx-2.5",
                        "gemini-omni",
                        "ltx-2.3",
                    ]),
                    resolution: z.enum(["480p", "720p", "1080p"]),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .describe("The prompt used to edit the video."),
                        })
                        .strict(),
                    assets: z
                        .object({
                            video_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The video to edit. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for video editing."),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => {
            const { model, resolution, end_seconds, start_seconds } =
                data.input.body;
            const duration = Math.max(0, end_seconds - (start_seconds ?? 0));
            const omni = model === "gemini-omni-1.1" || model === "gemini-omni";
            const multiplier = omni
                ? (resolution === "480p" ? 0 : resolution === "720p" ? 6 : 8)
                : resolution === "480p"
                ? 1
                : resolution === "720p"
                ? 2
                : 3;
            return {
                counts: {
                    CREDIT: Math.round(Math.ceil(duration * 24) * multiplier),
                },
            };
        },
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT: utils.json.optionalGet(data.output, "$.status") ===
                        "complete"
                    ? (utils.json.optionalNum(
                        data.output,
                        "$.credits_charged",
                    ) ?? 0)
                    : 0,
            },
        }),
    },
});
