import { z } from "zod";
import {
    zMediaUrl,
    zOutputUploadUrl,
    zTtlDays,
} from "../../../schema/common.ts";

/**
 * `POST /api/boreal/` for `model: "boreal-h3"` — the boreal-h3 subset of
 * the Boreal API's request body, mirrored field for field from
 * https://docs.creatify.ai/api-reference/boreal/post-boreal. Optionality
 * only, no defaults (design D25); the binding pins `model` and the
 * vendor defaults. `audio_url` and `negative_prompt` are boreal-only
 * inputs the API refuses on boreal-h3, so they are not mirrored;
 * `webhook_url` is withheld (the callback carries the account's API key).
 *
 * Cross-field rules the API enforces (free rejection, no charge) are
 * stated in the endpoint's `notes`: `.refine` does not survive
 * compilation.
 */
export const zBorealH3Body = z.strictObject({
    prompt: z.string().min(1).describe(
        "Describe the video: subject, action, camera, and any dialogue or " +
            "sound it should contain. In a reference render, refer to the " +
            "references by type and order: Image 1, Image 2, Video 1, " +
            "Audio 1.",
    ),
    image_url: zMediaUrl.describe(
        "Optional start frame (image-to-video). The output keeps this " +
            "image's own aspect ratio; send aspect_ratio 'auto' with it.",
    ).optional(),
    end_image_url: zMediaUrl.describe(
        "Optional closing frame; requires image_url.",
    ).optional(),
    reference_image_urls: z.array(zMediaUrl).max(9).describe(
        "Up to 9 reference images for reference-to-video (characters, " +
            "products, scenes). A reference render takes no image_url or " +
            "end_image_url. The first 5 are free; each one after that " +
            "costs 0.2 credits.",
    ).optional(),
    reference_video_urls: z.array(zMediaUrl).max(3).describe(
        "Up to 3 reference videos for reference-to-video (motion, " +
            "camera, identity), billed on top of the output per second of " +
            "their combined length, counted up to 15 seconds: 0.4 credits " +
            "at 768p, 0.6 at 1088p and 2k.",
    ).optional(),
    reference_audio_urls: z.array(zMediaUrl).max(3).describe(
        "Up to 3 reference audio tracks (voice), free, alongside at least " +
            "one image or video reference.",
    ).optional(),
    resolution: z.enum(["768p", "1088p", "2k"]).describe(
        "Delivery tier and rate: 768p (default) 0.13, 1088p 0.27 or 2k " +
            "(1440 px short edge) 0.53 credits per second of output.",
    ).optional(),
    aspect_ratio: z.enum(["auto", "16:9", "9:16", "1:1", "4:3", "3:4"])
        .describe(
            "Frame ratio. 'auto' (default) follows the start image's own " +
                "ratio (in a reference render, the first reference " +
                "image's) and is 16:9 without an image. With image_url " +
                "only 'auto' is accepted.",
        ).optional(),
    duration: z.number().int().min(1).max(15).describe(
        "Output length in whole seconds, 1 to 15 (default 10).",
    ).optional(),
    prompt_enhancement: z.enum(["auto", "none"]).describe(
        "'auto' (default) rewrites the prompt the way boreal-h3 was " +
            "evaluated — an ads rewrite that assumes a person on camera " +
            "and adds a few seconds of latency; 'none' renders the prompt " +
            "exactly as written (prefer it for general footage).",
    ).optional(),
    ttl_days: zTtlDays.optional(),
    output_upload_url: zOutputUploadUrl.optional(),
});
