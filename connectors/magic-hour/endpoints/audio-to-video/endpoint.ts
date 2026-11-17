import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Audio-to-Video",
        summary: "Audio-to-Video",
        description:
            "Audio-to-Video. Select a resolution for a pre-run credit estimate. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
        notes: [
            "Magic Hour validates that the end time exceeds the start time and the clip is between 1 and 60 seconds long.",
        ],
    },
    request: { method: "POST", path: "/v1/audio-to-video" },
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
                    resolution: z.enum(["480p", "720p", "1080p"])
                        .describe(
                            "Select a supported output resolution for the credit estimate.",
                        ),
                    assets: z
                        .object({
                            audio_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The path of the audio file. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Reference image for the initial frame of the video. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Provide the audio file and an optional reference image.",
                        ),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .describe(
                                    "Prompt to guide the visual style of the video.",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Attributes used to dictate the style of the output",
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
            const seconds = Math.max(
                0,
                data.input.body.end_seconds -
                    (data.input.body.start_seconds ?? 0),
            );
            const multiplier = {
                "480p": 1,
                "720p": 2,
                "1080p": 3,
            }[data.input.body.resolution];
            return { counts: { CREDIT: Math.ceil(seconds * 24) * multiplier } };
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
