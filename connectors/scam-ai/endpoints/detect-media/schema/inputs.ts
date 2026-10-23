import { z } from "zod";

/**
 * Vendor JSON body: https://scam.ai/docs/detect-link (checked 2026-10-11).
 * The platform infers image, video, or audio from the URL's content.
 * Connector-only restrictions belong at the endpoint binding.
 */
export const zDetectBody = z.object({
    url: z.string()
        .regex(/^https?:\/\/\S+$/, "must be a public http:// or https:// URL")
        .describe(
            "A public http:// or https:// URL of the image, video, or audio " +
                "to score (inline base64 is not accepted).",
        ),
    thumbnails: z.boolean().optional().describe(
        "Include a small base64 JPEG for each returned video frame. " +
            "The vendor defaults to false when omitted.",
    ),
});
