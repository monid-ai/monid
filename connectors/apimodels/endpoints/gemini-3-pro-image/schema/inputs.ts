import { z } from "zod";
import { zImageResolution, zMediaUrl, zPrompt } from "../../../schema/media.ts";

/**
 * `POST /v1/images/generations` body for `model: "gemini-3-pro-image"`
 * (Nano Banana Pro, GA) — the faithful mirror of
 * https://apimodels.app/docs/gemini-image (read 2026-11-25), minus `model`
 * and `callback_url`.
 */
export const zGemini3ProImageBody = z.object({
    prompt: zPrompt("Image description or editing instruction."),
    aspect_ratio: z
        .enum(["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"])
        .describe("Output aspect ratio. apimodels defaults to auto.")
        .optional(),
    resolution: zImageResolution(
        "Output tier: 1K or 2K ($0.08), 4K ($0.13).",
    ).optional(),
    image_urls: z
        .array(zMediaUrl)
        .min(1)
        .describe(
            "Reference images for editing or multi-image composition.",
        )
        .optional(),
}).strict();
