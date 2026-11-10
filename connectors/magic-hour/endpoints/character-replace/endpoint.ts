import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// API schema: Magic Hour OpenAPI at 2e0bbe9; price inputs: web-app at 595e4b9.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Character Replace",
        summary:
            "Transfer character motion with Kling 3.0, Wan Animate or MiniMax H3",
        description:
            "Replace a character in a video or animate a character image from a reference video using Kling 3.0, Wan Animate or MiniMax H3. Specify the model and resolution to estimate credits; supported modes, durations, and point selection depend on the model and subscription plan. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
        notes: [
            "Magic Hour validates that end time exceeds start time and rejects unsupported combinations. Wan Animate supports 480p and 720p; Kling 3.0 supports 720p and 1080p, with 3–10 second replace or 3–30 second animate clips; MiniMax H3 supports 1–60 second clips. Subject selection also varies by model and mode.",
        ],
    },
    request: { method: "POST", path: "/v1/character-replace" },
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
                            "End time of your clip (seconds). Must be greater than start_seconds.",
                        ),
                    model: z.enum(["wan-animate", "kling-3.0", "minimax-h3"]),
                    resolution: z.enum(["480p", "720p", "1080p"]),
                    assets: z
                        .object({
                            video_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Source video containing the subject to replace or animate. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Reference character image used as the replacement or animation target. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe(
                            "Source video and reference character image for the job.",
                        ),
                    style: z
                        .object({
                            mode: z
                                .enum(["replace", "animate"])
                                .describe(
                                    "Processing mode. `replace` swaps the detected subject with your reference character. `animate` transfers motion from the video onto your character image.",
                                )
                                .optional(),
                            prompt: z.string().max(2000).describe(
                                "Optional direction for Kling 3.0 and MiniMax H3.",
                            ).optional(),
                            selection_mode: z
                                .enum(["auto", "point"])
                                .describe(
                                    "How to locate the subject in the source video. `auto` detects a person automatically. `point` uses your `points` to mark the subject and is supported by `wan-animate` and by `minimax-h3` in replace mode. Defaults to `auto`.",
                                )
                                .optional(),
                            points: z
                                .array(
                                    z
                                        .object({
                                            position_x: z
                                                .number()
                                                .int()
                                                .min(0)
                                                .describe(
                                                    "Horizontal pixel coordinate in the source video frame at `time_seconds`, measured from the left edge.",
                                                ),
                                            position_y: z
                                                .number()
                                                .int()
                                                .min(0)
                                                .describe(
                                                    "Vertical pixel coordinate in the source video frame at `time_seconds`, measured from the top edge.",
                                                ),
                                            time_seconds: z
                                                .number()
                                                .min(0)
                                                .describe(
                                                    "Timestamp on the source video timeline in seconds. Uses the same clock as `start_seconds` and `end_seconds`.",
                                                ),
                                        })
                                        .strict(),
                                )
                                .describe(
                                    "On-frame markers for manual subject selection. Required when `selection_mode` is `point`. Ignored when `selection_mode` is `auto` or omitted. Rejected for models without subject selection (supported by `wan-animate` and by `minimax-h3` in replace mode).",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Optional style controls for replace vs animate mode and subject selection.",
                        )
                        .optional(),
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
            const multiplier = model === "wan-animate"
                ? (resolution === "480p" ? 2 : resolution === "720p" ? 4 : 0)
                : model === "kling-3.0"
                ? (resolution === "480p" ? 0 : resolution === "720p" ? 2 : 3)
                : resolution === "480p"
                ? 1
                : resolution === "720p"
                ? 2
                : 3;
            const chargedDuration = model === "kling-3.0"
                ? Math.floor(duration)
                : duration;
            return {
                counts: {
                    CREDIT: Math.round(
                        Math.max(10, Math.ceil(chargedDuration * 24)) *
                            multiplier,
                    ),
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
