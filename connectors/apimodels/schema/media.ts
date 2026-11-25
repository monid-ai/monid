import { z } from "zod";

/**
 * Shared vendor-mirror fragments for every apimodels endpoint.
 *
 * apimodels accepts reference images as https URLs, data URIs or bare
 * base64. This connector takes public `https://` URLs only, so a run record
 * never carries a multi-megabyte inline image (the kling / bytedance
 * `zMediaUrl` posture). `.regex()`, not `.refine()`: a regex compiles to a
 * JSON Schema `pattern` the engine enforces.
 */
export const zMediaUrl = z
    .string()
    .regex(/^https:\/\/\S+$/, "must be a public https:// URL")
    .describe(
        "A public https:// URL apimodels can fetch server-side (inline " +
            "base64 is not accepted by this connector).",
    );

/** The image price selector: 1K / 2K / 4K output. */
export function zImageResolution(describe: string) {
    return z.enum(["1K", "2K", "4K"]).describe(describe);
}

/** A text prompt; images document a 20,000-character ceiling. */
export function zPrompt(describe: string, max = 20_000) {
    return z.string().min(1).max(max).describe(describe);
}

/** Veo 3.1 Fast body — shared by the 720p and 1080p tiers, whose request
 *  shape is identical (docs: https://apimodels.app/docs/google-veo). */
export const zVeoFastBody = z.object({
    prompt: zPrompt("Text description of the video to generate."),
    aspect_ratio: z
        .enum(["16:9", "9:16"])
        .describe("Output aspect ratio. apimodels defaults to 16:9.")
        .optional(),
    images: z
        .array(zMediaUrl)
        .min(1)
        .max(2)
        .describe(
            "Optional frames: [first frame] or [first frame, last frame]. " +
                "Omit for plain text-to-video.",
        )
        .optional(),
}).strict();
