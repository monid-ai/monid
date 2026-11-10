import { z } from "zod";

/**
 * GET /v1/youtube/video/transcript query — the parameter table on
 * https://www.socialcrawl.dev/platforms/youtube/video-transcript.
 * moments and q are mutually exclusive; that is a note, not a schema
 * rule. Strict.
 */
export const zYoutubeVideoTranscriptQuery = z.object({
    url: z.string().min(1).describe(
        "Full URL of the YouTube video.",
    ),
    language: z.string().regex(/^[a-z]{2}$/).describe(
        "Two-letter caption language, such as en or es. If no track " +
            "matches, the call is a 404 RESOURCE_NOT_FOUND (reason " +
            "no_captions) and costs 0. Omit it for the language spoken " +
            "in the original audio.",
    ).optional(),
    moments: z.string().min(1).describe(
        "CSV of moment kinds to find: brand, sponsor_read, product_demo, " +
            "call_to_action. Returns data.moments. Does not add credits. " +
            "Do not send with q.",
    ).optional(),
    brand: z.string().min(1).describe(
        "With moments, the company or product to look for, so a namesake " +
            "is not counted.",
    ).optional(),
    q: z.string().min(1).max(300).describe(
        "A question about the video. Returns data.moments of kind " +
            "answers_query. Does not add credits. Do not send with moments.",
    ).optional(),
    dry_run: z.literal(1).describe(
        "When 1, return a cost preview and charge 0 credits. The example " +
            "request documents dry_run=1.",
    ).optional(),
}).strict();
