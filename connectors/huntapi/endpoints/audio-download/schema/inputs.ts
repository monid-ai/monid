import { z } from "zod";

/**
 * /v1/audio/download query params — mirrors the vendor OpenAPI
 * (https://docs.huntapi.com). Optionality only; strict, so an unknown key is rejected.
 */
export const zHuntapiAudioDownloadQueryParams = z.strictObject({
    query: z.url({ protocol: /^https?$/ }).describe(
        "Public URL of the video or audio.",
    ),
    audio_format: z.enum(["mp3", "m4a", "opus", "wav"]).describe(
        "Output format, `mp3` by default.",
    ).optional(),
    max_duration: z.number().int().min(1).describe(
        "Extract at most this many seconds.",
    ).optional(),
});
