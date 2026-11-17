import { z } from "zod";
import { zCursor } from "../../../schema/common.ts";

/** `POST /v1/youtube/comments` request body — the faithful vendor mirror.
 *  The vendor takes `videoUrl` or `videoId`, not both; the binding
 *  enforces it. */
export const zYoutubeCommentsBody = z.object({
    videoUrl: z.string().describe(
        "Link to the YouTube video, like https://youtu.be/p0fybvFyOlM. " +
            "Send this or videoId.",
    ).optional(),
    videoId: z.string().describe(
        "YouTube video id, like p0fybvFyOlM. Send this or videoUrl.",
    ).optional(),
    comment: z.string().min(1).max(12000).describe(
        "A comment's repliesCursor from an earlier response. Returns that " +
            "comment's replies.",
    ).optional(),
    sort: z.enum(["top", "newest"]).describe("Vendor default top.")
        .optional(),
    cursor: zCursor.optional(),
}).strict();
