import { z } from "zod";
import { zMediaUrl, zOutputUploadUrl, zTtlDays } from "./common.ts";

/**
 * The request body both Aurora endpoints share — `POST /api/aurora/`
 * minus the model selector each endpoint pins (`model_version`) and the
 * knobs only one tier reads (`prompt_guidance_scale` on Aurora v1,
 * `resolution` on Aurora 2.0). Faithful mirror: optionality only, no
 * defaults (design D25); defaults live at each endpoint's binding.
 *
 * `webhook_url` is deliberately NOT mirrored: Creatify authenticates the
 * callback with the account's own API key as a bearer token, which must
 * never travel to a URL a caller chose. Poll the run instead.
 */
export const zAuroraBodyBase = z.strictObject({
    audio: zMediaUrl.describe(
        "Speech audio that drives the avatar: mp3 or wav at a public " +
            "http(s) URL. The video is exactly as long as this track.",
    ),
    image: zMediaUrl.describe(
        "Portrait of the speaker: png, jpg, jpeg or webp at a public " +
            "http(s) URL. Framing and aspect ratio follow this image.",
    ),
    name: z.string().max(255).describe("Optional label for the job.")
        .optional(),
    text_prompt: z.string().describe(
        "Optional direction for the render: mood, expression, pose, " +
            "motion, camera, lighting and setting.",
    ).optional(),
    ttl_days: zTtlDays.optional(),
    output_upload_url: zOutputUploadUrl.optional(),
});
