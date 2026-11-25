import { z } from "zod";
import { zImageResolution, zMediaUrl, zPrompt } from "../../../schema/media.ts";

/**
 * `POST /v1/images/generations` body for `model: "gpt-image-2"` — the
 * faithful mirror of https://apimodels.app/docs/gpt-image-2 (read
 * 2026-11-25), minus `model` (pinned by the endpoint), `callback_url`
 * (the run polls) and the inline-base64 inputs (`image_base64`).
 */
export const zGptImage2Body = z.object({
    prompt: zPrompt(
        "Image description or editing instruction, 1-20,000 characters. " +
            'With several reference images, cite them as "image 1", ' +
            '"image 2" in the order given.',
    ),
    aspect_ratio: z
        .enum([
            "auto",
            "1:1",
            "2:3",
            "3:2",
            "4:5",
            "5:4",
            "4:3",
            "3:4",
            "16:9",
            "9:16",
            "21:9",
        ])
        .describe(
            "Output aspect ratio. With reference images, auto follows the " +
                "first reference; for text-to-image auto returns a square.",
        )
        .optional(),
    resolution: zImageResolution(
        "Output tier: 1K ($0.025), 2K ($0.03) or 4K ($0.05). apimodels " +
            "defaults to 1K.",
    ).optional(),
    image_urls: z
        .array(zMediaUrl)
        .min(1)
        .max(16)
        .describe(
            "Reference images for editing or multi-image composition, up " +
                "to 16, each at most 10 MB.",
        )
        .optional(),
    output_format: z
        .enum(["png", "jpeg", "webp"])
        .describe(
            "Delivery format. Omitted: opaque images arrive as JPEG, " +
                "images with transparency as PNG.",
        )
        .optional(),
}).strict();
