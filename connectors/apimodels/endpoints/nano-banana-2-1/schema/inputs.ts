import { z } from "zod";
import { zImageResolution, zMediaUrl, zPrompt } from "../../../schema/media.ts";

/**
 * `POST /v1/images/generations` body for `model: "nano-banana-2-1"` — the
 * faithful mirror of https://apimodels.app/docs/nano-banana-2-1 (read
 * 2026-11-25), minus `model`, `callback_url` and the single-image `image`
 * alias (`image_urls` covers it).
 */
export const zNanoBanana21Body = z.object({
    prompt: zPrompt(
        "Image description or editing instruction, 1-20,000 characters.",
    ),
    aspect_ratio: z
        .enum([
            "auto",
            "1:1",
            "2:3",
            "3:2",
            "3:4",
            "4:3",
            "4:5",
            "5:4",
            "9:16",
            "16:9",
            "21:9",
            "1:4",
            "4:1",
            "1:8",
            "8:1",
        ])
        .describe("Output aspect ratio. apimodels defaults to auto.")
        .optional(),
    resolution: zImageResolution(
        "Output tier: 1K ($0.022), 2K ($0.036) or 4K ($0.06). apimodels " +
            "defaults to 1K.",
    ).optional(),
    image_urls: z
        .array(zMediaUrl)
        .min(1)
        .max(10)
        .describe(
            "Reference images (up to 10). Supplying any turns the request " +
                "into an edit or a multi-image composition; cite them as " +
                '"image 1", "image 2" in the prompt.',
        )
        .optional(),
}).strict();
