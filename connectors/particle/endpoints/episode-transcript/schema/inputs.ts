import { z } from "zod";
import { zEpisodeRef } from "../../../schema/common.ts";

/** GET /v1/podcasts/episodes/{id}/transcript — the vendor mirror
 *  (api.particle.pro/openapi.json `get-episode-transcript`, 2026-10-28). */
export const zEpisodeTranscriptPathParams = z.strictObject({
    id: zEpisodeRef,
});

export const zEpisodeTranscriptQueryParams = z.strictObject({
    format: z.enum(["dialogue", "text", "srt"]).describe(
        "dialogue (default): speaker-attributed lines with timestamps; " +
            "text: plain text; srt: SubRip subtitles.",
    ).optional(),
    speaker: z.string().min(1).describe(
        "Only lines from this speaker: a name (full or partial, " +
            "case-insensitive), a person slug or ID, or a knowledge-graph " +
            "entity slug or ID.",
    ).optional(),
    start: z.number().describe(
        "Start of the time range in seconds; every line overlapping the " +
            "range is returned, so the first may begin before it.",
    ).optional(),
    end: z.number().describe(
        "End of the time range in seconds (defaults to the end of the " +
            "episode); the last line may run past it.",
    ).optional(),
});
