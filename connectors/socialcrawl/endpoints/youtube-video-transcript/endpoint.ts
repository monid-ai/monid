import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeVideoTranscriptQuery } from "./schema/inputs.ts";

/**
 * GET /v1/youtube/video/transcript — timestamped caption segments.
 * 3 credits. A video with no matching captions is a 404 and costs 0.
 * moments and q do not add credits.
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Video Transcript",
        summary: "Get a YouTube video's transcript as timestamped segments.",
        description: "The spoken transcript of one YouTube video: each " +
            "segment has its text, start offset, and duration in seconds, " +
            "plus the language, word count, and speech rate. Without " +
            "language, the transcript is the language of the original " +
            "audio, not an auto-dub, and each segment's lang says which " +
            "one you got. A video with no captions answers 404 " +
            "RESOURCE_NOT_FOUND and costs nothing; error.details.reason " +
            "is captions_disabled, members_only, login_required, " +
            "no_captions, or video_gone. A video uploaded in the last day " +
            "can say captions_disabled until YouTube generates automatic " +
            "captions, so that one reason is worth retrying later.",
        docsUrl:
            "https://www.socialcrawl.dev/platforms/youtube/video-transcript",
        categories: ["youtube"],
        notes: [
            "3 credits. A cache hit is 0. A 404 because no caption track " +
            "matches is 0.",
            "Send moments or q, not both. Neither adds credits. If the " +
            "moment step cannot run, the transcript still comes back and " +
            "data._warnings says moments_unavailable.",
        ],
    },
    request: { method: "GET", path: "/v1/youtube/video/transcript" },
    input: { schema: { queryParams: zYoutubeVideoTranscriptQuery } },
    /** The page's own client budget is 18 seconds. */
    timeouts: { requestMs: 30_000, runMs: 40_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "credits",
            description: "SocialCrawl credits_used. The lane lists at 3.",
        },
        estimate: ({ data }) => {
            const dry = data.input.queryParams.dry_run;
            if (dry === 1) return { counts: {} };
            return { counts: { CREDIT: 3 } };
        },
    },
});
