import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Pricing: Magic Hour video model configuration, verified 2026-10-27; estimates can exceed final charges.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Text-to-Video",
        summary:
            "Generate video from text with Kling 3.0, Kling 2.6, Seedance, Veo or LTX",
        description:
            "Generate a video from a text prompt with Kling 3.0, Kling 2.6, Seedance, Veo, LTX and other supported models. A 5-second Kling 3.0 clip at 720p with audio off and no video reference uses an estimated 240 Magic Hour credits. Direct Magic Hour Creator usage billing estimates $0.288 for this clip or $0.576 for a 5-second 1080p clip with audio; both assume no video reference and all credits fall within the first 100,000 credits in the month. Usage billing requires setup: https://docs.magichour.ai/billing/usage-based-pricing. Monid sets its own hosted price; inspect it separately. Choose a concrete model and resolution. When references are supplied, the estimate uses the highest applicable reference rate; actual credits settle on completion. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
        notes: [
            "Kling base rates verified 2026-10-27, without video references: Kling 3.0 uses 48 credits/second at 720p with audio off, 72 with audio on; 1080p uses 72 or 96 respectively. Kling 2.6 uses 36 at 720p or 72 at 1080p and does not support native audio. These are credit estimates, not a Monid USD quote; final project credits may differ. See https://docs.magichour.ai/api-reference/models.",
            "Magic Hour validates the selected model, resolution, duration, audio and reference combination. Unsupported model-resolution pairs estimate zero and are rejected by Magic Hour.",
        ],
    },
    request: { method: "POST", path: "/v1/text-to-video" },
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
                    end_seconds: z
                        .number()
                        .int()
                        .min(1)
                        .max(60)
                        .describe(
                            "The total duration of the output video in seconds. Supported durations depend on the chosen model:\n\n* **`gemini-omni-1.1`**: any integer from 3 to 10\n* **`kling-2.6`**: 5, 10\n* **`kling-3.0`**: any integer from 3 to 15\n* **`ltx-2.5`**: any integer from 1 to 60\n* **`minimax-h3`**: any integer from 1 to 30\n* **`seedance-1.5`**: any integer from 4 to 12\n* **`seedance-2.0`**: any integer from 4 to 15\n* **`seedance-2.0-fast`**: any integer from 4 to 15\n* **`seedance-2.0-mini`**: any integer from 4 to 15\n* **`seedance-2.5`**: any integer from 4 to 30\n* **`veo3.1`**: 4, 6, 8, 16, 24, 32, 40, 48, 56\n* **`veo3.1-lite`**: 4, 6, 8, 16, 24, 32, 40, 48, 56\n* **`wan-2.2`**: 3, 4, 5, 6, 7, 8, 9, 10, 15\n* **`wan-3.0`**: 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30\n",
                        ),
                    aspect_ratio: z
                        .enum(["16:9", "9:16", "1:1"])
                        .describe(
                            "Provide `aspect_ratio` to set the video’s aspect ratio. Determines the aspect ratio of the output video.\n\n* **`gemini-omni-1.1`**: Supports 16:9, 9:16.\n* **`kling-2.6`**: Supports 9:16, 16:9, 1:1.\n* **`kling-3.0`**: Supports 9:16, 16:9, 1:1.\n* **`ltx-2.5`**: Supports 9:16, 16:9, 1:1.\n* **`minimax-h3`**: Supports 16:9, 9:16, 1:1.\n* **`seedance-1.5`**: Supports 9:16, 16:9, 1:1.\n* **`seedance-2.0`**: Supports 9:16, 16:9, 1:1.\n* **`seedance-2.0-fast`**: Supports 9:16, 16:9, 1:1.\n* **`seedance-2.0-mini`**: Supports 9:16, 16:9, 1:1.\n* **`seedance-2.5`**: Supports 9:16, 16:9, 1:1.\n* **`veo3.1`**: Supports 9:16, 16:9.\n* **`veo3.1-lite`**: Supports 9:16, 16:9.\n* **`wan-2.2`**: Supports 9:16, 16:9, 1:1.\n* **`wan-3.0`**: Supports 16:9, 9:16, 1:1.\n",
                        )
                        .optional(),
                    resolution: z.enum(["360p", "480p", "720p", "1080p", "4k"])
                        .describe(
                            "Controls the output video resolution. Defaults to `720p` on paid tiers and `480p` on free tiers.\n\n* **`gemini-omni-1.1`**: Supports 360p, 720p, 1080p, 4k.\n* **`kling-2.6`**: Supports 720p, 1080p.\n* **`kling-3.0`**: Supports 720p, 1080p, 4k.\n* **`ltx-2.5`**: Supports 480p, 720p, 1080p.\n* **`minimax-h3`**: Supports 480p, 720p, 1080p.\n* **`seedance-1.5`**: Supports 480p, 720p, 1080p.\n* **`seedance-2.0`**: Supports 480p, 720p, 1080p, 4k.\n* **`seedance-2.0-fast`**: Supports 480p, 720p.\n* **`seedance-2.0-mini`**: Supports 480p, 720p.\n* **`seedance-2.5`**: Supports 480p, 720p, 1080p.\n* **`veo3.1`**: Supports 720p, 1080p.\n* **`veo3.1-lite`**: Supports 720p, 1080p.\n* **`wan-2.2`**: Supports 480p, 720p, 1080p.\n* **`wan-3.0`**: Supports 480p, 720p, 1080p.\n Specify a concrete value for Monid credit estimation; the plan-dependent API default is not selectable here.",
                        ),
                    model: z.enum([
                        "minimax-h3",
                        "kling-3.0",
                        "ltx-2.5",
                        "wan-2.2",
                        "seedance-2.5",
                        "wan-3.0",
                        "seedance-2.0-mini",
                        "veo3.1",
                        "veo3.1-lite",
                        "seedance-2.0",
                        "kling-2.6",
                        "gemini-omni-1.1",
                        "seedance-2.0-fast",
                        "seedance-1.5",
                        "sora-2",
                        "ltx-2.3",
                        "ltx-2",
                        "kling-2.5",
                        "kling-1.6",
                        "seedance",
                        "kling-2.5-audio",
                        "veo3.1-audio",
                    ]).describe(
                        "The AI model to use for video generation.\n\n* `default`: uses our currently recommended model for general use. For paid tiers, defaults to `kling-3.0`. For free tiers, it defaults to `ltx-2.5`.\n* `gemini-omni-1.1`: Best for precise short clips, first/last frames, and high-resolution output.\n* `kling-2.6`: Best for action, motion blur, and controlled camera moves.\n* `kling-3.0`: Best for cinematic stories, references, and optional audio.\n* `ltx-2.5`: Fastest for general scenes, long clips, audio, and rapid iteration.\n* `minimax-h3`: Great for reference-driven clips with native audio and longer durations.\n* `seedance-1.5`: Best for smooth, consistent motion with an end frame.\n* `seedance-2.0`: Best for reference-led clips with precise subject control.\n* `seedance-2.0-fast`: Fast reference-led clips with consistent motion and audio.\n* `seedance-2.0-mini`: Faster reference-led clips with consistent motion and audio.\n* `seedance-2.5`: Best for premium realism, detail, and natural motion.\n* `veo3.1`: Best for romantic interactions and expressive action, with realistic detail.\n* `veo3.1-lite`: Balanced realism and audio at a lower cost than Veo 3.1.\n* `wan-2.2`: Best for physical motion, action, and camera movement.\n* `wan-3.0`: High-quality video with native audio, long clips, and end-frame control.\n\nIf you specify the deprecated model value that includes the `-audio` suffix, this will be the same as included `audio` as `true`. Specify a concrete value for Monid credit estimation; the plan-dependent API default is not selectable here.",
                    ),
                    audio: z
                        .boolean()
                        .describe(
                            "Whether to include audio in the video. Defaults to `false` if not specified.\n\nAudio support varies by model:\n* **`gemini-omni-1.1`**: Not supported\n* **`kling-2.6`**: Not supported\n* **`kling-3.0`**: Toggle-able: audio adds extra credits when enabled\n* **`ltx-2.5`**: Toggle-able: no additional credits for audio\n* **`minimax-h3`**: Toggle-able: no additional credits for audio\n* **`seedance-1.5`**: Toggle-able: audio adds extra credits when enabled\n* **`seedance-2.0`**: Toggle-able: no additional credits for audio\n* **`seedance-2.0-fast`**: Toggle-able: no additional credits for audio\n* **`seedance-2.0-mini`**: Toggle-able: no additional credits for audio\n* **`seedance-2.5`**: Toggle-able: no additional credits for audio\n* **`veo3.1`**: Toggle-able: audio adds extra credits when enabled\n* **`veo3.1-lite`**: Toggle-able: audio adds extra credits when enabled\n* **`wan-2.2`**: Not supported\n* **`wan-3.0`**: Toggle-able: no additional credits for audio\n",
                        )
                        .optional(),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .max(20000)
                                .describe("The prompt used for the video."),
                        })
                        .strict(),
                    references: z
                        .array(
                            z
                                .object({
                                    name: z
                                        .string()
                                        .regex(new RegExp("^[A-Za-z][\\w-]*$")),
                                    file_path: z.string().min(1),
                                })
                                .strict(),
                        )
                        .min(1)
                        .max(10)
                        .describe(
                            "Reference media for video generation. Name references without @ and refer to them as @name in style.prompt. Maximum 10 references total.\n\nSupported models and reference media:\n* **`gemini-omni-1.1`**: Supports images, videos. Up to 10 references.\n* **`kling-3.0`**: Supports images, videos.\n* **`minimax-h3`**: Supports images, videos, audio.\n* **`seedance-2.0`**: Supports images, videos, audio.\n* **`seedance-2.0-fast`**: Supports images, videos, audio.\n* **`seedance-2.0-mini`**: Supports images, videos, audio.\n* **`seedance-2.5`**: Supports images, videos, audio.\n* **`veo3.1`**: Supports images. Up to 3 references. Requires `end_seconds` of 8.\n* **`wan-3.0`**: Supports images, videos, audio.",
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
            // Rows: 360p, 480p, 720p, 1080p, 4k. Columns: base, audio, video reference.
            // Values are credits per frame; zero marks an unsupported resolution.
            const rates = {
                "gemini-omni-1.1": [
                    [2, 2, 2],
                    [0, 0, 0],
                    [6, 6, 6],
                    [8, 8, 8],
                    [16, 16, 16],
                ],
                "kling-2.6": [
                    [0, 0, 0],
                    [0, 0, 0],
                    [1.5, 1.5, 1.5],
                    [3, 3, 3],
                    [0, 0, 0],
                ],
                "kling-3.0": [[0, 0, 0], [0, 0, 0], [2, 3, 4], [3, 4, 6], [
                    10,
                    12,
                    12,
                ]],
                "ltx-2.5": [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [
                    0,
                    0,
                    0,
                ]],
                "minimax-h3": [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [
                    0,
                    0,
                    0,
                ]],
                "wan-2.2": [[0, 0, 0], [1.5, 1.5, 1.5], [3, 3, 3], [
                    4.5,
                    4.5,
                    4.5,
                ], [0, 0, 0]],
                "wan-3.0": [[0, 0, 0], [2, 2, 2], [4, 4, 4], [7.5, 7.5, 7.5], [
                    0,
                    0,
                    0,
                ]],
                "seedance-1.5": [[0, 0, 0], [1.25, 2.5, 1.25], [2.5, 5, 2.5], [
                    3.75,
                    7.5,
                    3.75,
                ], [0, 0, 0]],
                "seedance-2.0": [
                    [0, 0, 0],
                    [4, 4, 4],
                    [9, 9, 9],
                    [22, 22, 28],
                    [46, 46, 55],
                ],
                "seedance-2.0-fast": [[0, 0, 0], [3.5, 3.5, 4], [7.5, 7.5, 9], [
                    0,
                    0,
                    0,
                ], [0, 0, 0]],
                "seedance-2.0-mini": [[0, 0, 0], [2, 2, 3], [5, 5, 6], [
                    0,
                    0,
                    0,
                ], [0, 0, 0]],
                "seedance-2.5": [[0, 0, 0], [7, 7, 8], [14, 14, 17], [
                    35,
                    35,
                    42,
                ], [0, 0, 0]],
                "veo3.1": [[0, 0, 0], [0, 0, 0], [4, 5, 4], [5, 6, 5], [
                    0,
                    0,
                    0,
                ]],
                "veo3.1-lite": [[0, 0, 0], [0, 0, 0], [2, 3, 2], [3, 4, 3], [
                    0,
                    0,
                    0,
                ]],
            };
            const requested = data.input.body.model;
            const model = requested === "seedance"
                ? "seedance-1.5"
                : requested === "sora-2"
                ? "minimax-h3"
                : requested === "ltx-2" || requested === "ltx-2.3"
                ? "ltx-2.5"
                : requested === "kling-2.5" || requested === "kling-2.5-audio"
                ? "kling-2.6"
                : requested === "kling-1.6"
                ? "kling-3.0"
                : requested === "veo3.1-audio"
                ? "veo3.1"
                : requested;
            const index = {
                "360p": 0,
                "480p": 1,
                "720p": 2,
                "1080p": 3,
                "4k": 4,
            }[data.input.body.resolution];
            const values = rates[model][index];
            const audio = data.input.body.audio ??
                (requested === "veo3.1-audio" ||
                    requested === "kling-2.5-audio");
            const videoReferencePossible =
                (data.input.body.references?.length ?? 0) > 0;
            // References may be bucket paths whose media type is resolved by the
            // server. Reserve the higher source-backed video-reference rate.
            const multiplier = videoReferencePossible
                ? Math.max(audio ? values[1] : values[0], values[2])
                : audio
                ? values[1]
                : values[0];
            const fps = model === "wan-2.2" ? 16 : 24;
            return {
                counts: {
                    CREDIT: Math.round(
                        Math.ceil(data.input.body.end_seconds * fps) *
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
