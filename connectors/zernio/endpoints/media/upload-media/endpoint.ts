import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

export const zUploadMediaBody = z.object({
    filename: z.string().min(1).describe("File name, e.g. 'launch.mp4'."),
    contentType: z.string().min(1).describe(
        "MIME type, e.g. 'image/jpeg', 'image/png', 'video/mp4', " +
            "'application/pdf'.",
    ),
    size: z.number().int().positive().max(5_368_709_120).optional()
        .describe("File size in bytes (up to 5 GB), checked up front."),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Upload Media",
        summary:
            "Get an upload url for an image or video (up to 5 GB) and the public url to post it with.",
        description:
            "Use when your media is a local file rather than a public " +
            "url. Returns 'uploadUrl' (PUT the raw file bytes to it with " +
            "the same Content-Type, within 1 hour) and 'publicUrl' (pass " +
            "it in /create-post mediaItems once the upload finishes). " +
            "Skip this when the media already has a public HTTPS url.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
    },
    endpoint: "/upload-media",
    request: { method: "POST", path: "/api/v1/media/presign" },
    input: { schema: { body: zUploadMediaBody } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
