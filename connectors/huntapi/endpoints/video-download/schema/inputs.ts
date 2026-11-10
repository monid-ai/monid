import { z } from "zod";

/**
 * /v1/video/download query params — mirrors the vendor OpenAPI
 * (https://docs.huntapi.com). Optionality only; strict, so an unknown key is rejected.
 */
export const zHuntapiVideoDownloadQueryParams = z.strictObject({
    query: z.url({ protocol: /^https?$/ }).describe(
        "Public URL of the video.",
    ),
    video_quality: z.enum(["best", "1080p", "720p", "480p", "360p"]).describe(
        "Video quality, `best` by default.",
    ).optional(),
    video_format: z.enum(["mp4", "webm", "mkv"]).describe(
        "Preferred output format, `mp4` by default.",
    ).optional(),
    max_duration: z.number().int().min(1).describe(
        "Download at most this many seconds of the video.",
    ).optional(),
});
