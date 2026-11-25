import { z } from "zod";
import { zMediaUrl, zPrompt } from "../../../schema/media.ts";

/**
 * `POST /v1/video/generations` body for `model: "seedance-2.0"` — the
 * faithful mirror of https://apimodels.app/docs/seedance-2-0-official (read
 * 2026-11-25), minus `model`, `callback_url`, asset-library references
 * (`asset://`, an account-level resource this connector does not manage)
 * and the reference video / audio inputs.
 */
export const zSeedance20Body = z.object({
    prompt: zPrompt(
        "Text description of the video. Cite reference images in order " +
            "as @image1, @image2.",
    ),
    resolution: z
        .enum(["480p", "720p", "1080p"])
        .describe(
            "Output resolution — selects the per-second rate. apimodels " +
                "defaults to 720p.",
        )
        .optional(),
    aspect_ratio: z
        .enum(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "adaptive"])
        .describe(
            "Output aspect ratio. With a first frame the ratio follows the " +
                "frame (adaptive).",
        )
        .optional(),
    duration: z
        .number()
        .int()
        .min(4)
        .max(15)
        .describe(
            "Clip length in whole seconds, 4-15. apimodels defaults to 8.",
        )
        .optional(),
    generate_audio: z
        .boolean()
        .describe(
            "Generate a synchronized audio track (voices, effects, music). " +
                "apimodels defaults to true.",
        )
        .optional(),
    first_frame_url: zMediaUrl
        .describe("First frame for image-to-video (public https:// URL).")
        .optional(),
    last_frame_url: zMediaUrl
        .describe(
            "Last frame for image-to-video; requires first_frame_url.",
        )
        .optional(),
    reference_image_urls: z
        .array(zMediaUrl)
        .min(1)
        .max(9)
        .describe(
            "Reference images (up to 9) for characters, products or style; " +
                "cited in the prompt in order as @image1, @image2.",
        )
        .optional(),
}).strict();
