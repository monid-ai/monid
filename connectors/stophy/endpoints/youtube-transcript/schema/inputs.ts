import { z } from "zod";
import { zLanguageTag } from "../../../schema/common.ts";

/** `POST /v1/youtube/transcript` request body — the faithful vendor mirror.
 *  The vendor takes `videoUrl` or `videoId`, not both; the binding
 *  enforces it. */
export const zYoutubeTranscriptBody = z.object({
    videoUrl: z.string().describe(
        "Link to the YouTube video, like https://youtu.be/p0fybvFyOlM. " +
            "Send this or videoId.",
    ).optional(),
    videoId: z.string().describe(
        "YouTube video id, like p0fybvFyOlM. Send this or videoUrl.",
    ).optional(),
    language: zLanguageTag.optional(),
    includeTimestamps: z.boolean().describe(
        "Return timed `segments` beside the text (vendor default false).",
    ).optional(),
}).strict();
