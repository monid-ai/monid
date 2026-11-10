import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Pricing sources and verification date: see the provider.ts header.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Image Editor",
        summary: "AI Image Editor",
        description:
            "AI Image Editor. Select an explicit model and resolution for a pre-run credit estimate. Supported input count, output count, resolution and availability depend on the model and subscription tier. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
        notes: [
            "Explicit model and resolution are required here to estimate credits. Model, subscription plan, source image count and output count determine availability.",
            "Grid models nano-banana-2, nano-banana-2.1 and nano-banana-pro accept 1, 4, 9 or 16 outputs; other models accept one. Multiple outputs require 1:1 and 2k for four or 1k for nine or sixteen. With more than one source image grid models allow at most four outputs.",
            "Nano Banana Pro does not support 640px; Nano Banana, Nano Banana 2 Lite and Krea 2 support at most 1k; Seedream 5 Pro, Qwen Edit, Qwen Image 2.1 and Flux 2 Klein support at most 2k.",
        ],
    },
    request: { method: "POST", path: "/v1/ai-image-editor" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your image a custom name for easy identification.",
                        )
                        .optional(),
                    image_count: z.union([
                        z.literal(1),
                        z.literal(4),
                        z.literal(9),
                        z.literal(16),
                    ]).optional(),
                    model: z.enum([
                        "qwen-image-2.1",
                        "gpt-image-2",
                        "nano-banana-2",
                        "flux-2-klein",
                        "nano-banana-pro",
                        "seedream-v5-pro",
                        "seedream-v4.5",
                        "nano-banana-2.1",
                        "qwen-edit",
                        "nano-banana-2-lite",
                        "krea-2",
                        "gpt-image-2.5-flare",
                        "seedream-v4",
                        "nano-banana",
                    ]),
                    aspect_ratio: z
                        .enum([
                            "auto",
                            "16:9",
                            "9:16",
                            "4:3",
                            "3:2",
                            "1:1",
                            "4:5",
                            "2:3",
                        ])
                        .describe(
                            "The aspect ratio of the output image(s). If not specified, defaults to `auto`.",
                        )
                        .optional(),
                    resolution: z.enum(["640px", "1k", "2k", "4k"]),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .max(15000)
                                .describe("The prompt used to edit the image."),
                        })
                        .strict(),
                    assets: z
                        .object({
                            image_file_paths: z
                                .array(z.string().min(1))
                                .max(10)
                                .describe(
                                    "The image(s) used in the edit, up to 10 images; model-specific limits apply. This value is either\n- a direct URL to the image file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("Provide the assets for image edit"),
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
            const { model, resolution, aspect_ratio: aspectRatio } =
                data.input.body;
            const count = data.input.body.image_count ?? 1;
            const grid = model === "nano-banana-2" ||
                model === "nano-banana-2.1" || model === "nano-banana-pro";
            const inputCount =
                data.input.body.assets.image_file_paths?.length ?? 0;
            if (
                (!grid && count !== 1) ||
                (grid && count > 1 &&
                    ((aspectRatio !== undefined && aspectRatio !== "1:1") ||
                        resolution !== (count >= 9 ? "1k" : "2k"))) ||
                (grid && count > 4 && inputCount > 1)
            ) {
                return { counts: { CREDIT: 0 } };
            }
            let credits = 0;
            if (model === "nano-banana-pro") {
                if (resolution === "640px") {
                    return { counts: { CREDIT: 0 } };
                }
                credits = resolution === "1k"
                    ? (count === 1 ? 150 : 250)
                    : resolution === "2k"
                    ? (count === 1 ? 200 : 350)
                    : (count === 1 ? 300 : 450);
            } else if (
                model === "nano-banana-2" || model === "nano-banana-2.1"
            ) {
                credits = model === "nano-banana-2"
                    ? (count === 1
                        ? (resolution === "2k"
                            ? 150
                            : resolution === "4k"
                            ? 200
                            : 100)
                        : 200)
                    : (count === 1
                        ? (resolution === "2k"
                            ? 75
                            : resolution === "4k"
                            ? 150
                            : 50)
                        : 150);
            } else if (
                model === "gpt-image-2" || model === "gpt-image-2.5-flare"
            ) {
                credits = count * (model === "gpt-image-2" ? 50 : 100) *
                    (resolution === "640px"
                        ? 1
                        : resolution === "1k"
                        ? 2
                        : resolution === "2k"
                        ? 4
                        : 8);
            } else if (model === "seedream-v4") {
                credits = count *
                    (resolution === "2k" ? 50 : resolution === "4k" ? 60 : 40);
            } else if (model === "seedream-v4.5") {
                credits = count *
                    (resolution === "2k" ? 75 : resolution === "4k" ? 100 : 50);
            } else if (model === "seedream-v5-pro") {
                if (resolution === "4k") {
                    return { counts: { CREDIT: 0 } };
                }
                credits = count * (resolution === "2k" ? 150 : 75);
            } else if (
                model === "nano-banana" || model === "nano-banana-2-lite" ||
                model === "krea-2"
            ) {
                if (resolution === "2k" || resolution === "4k") {
                    return { counts: { CREDIT: 0 } };
                }
                credits = count * (model === "krea-2" ? 10 : 50);
            } else {
                if (resolution === "4k") {
                    return { counts: { CREDIT: 0 } };
                }
                credits = count *
                    ((model === "qwen-image-2.1" || model === "qwen-edit")
                        ? 10
                        : 5) *
                    (resolution === "2k" ? 2 : 1);
            }
            return { counts: { CREDIT: credits } };
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
