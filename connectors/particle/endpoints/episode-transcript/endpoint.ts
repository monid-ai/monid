import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zEpisodeTranscriptPathParams,
    zEpisodeTranscriptQueryParams,
} from "./schema/inputs.ts";

/**
 * GET /v1/podcasts/episodes/{id}/transcript — one episode's diarized
 * transcript. $0.01 per call (particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29):
 * overrides the amount.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Episode Transcript",
        summary: "The diarized transcript of one episode, as " +
            "speaker-attributed lines, plain text or SRT.",
        description: "Read the full transcript of a podcast episode, " +
            "speaker-identified and timestamped: as dialogue (one entry " +
            "per line with the speaker's name and the second it starts), " +
            "as plain text, or as SRT subtitles. Filter to one speaker by " +
            "name or slug, or to a time range in seconds, to pull just " +
            "the part an agent needs. Episode IDs come from " +
            "particle#v1/podcasts/{id}/episodes or from any search " +
            "result. Transcripts land within minutes of an episode " +
            "airing.",
        docsUrl:
            "https://docs.particle.pro/api-reference/podcast-transcripts/get-episode-transcript",
        categories: ["podcasts"],
        notes: [
            "A full transcript of a long episode is large (tens of " +
            "thousands of words); narrow with start/end or speaker, or " +
            "use particle#v1/podcasts/episodes/search for the passages " +
            "that matter.",
            "An episode without a transcript (has_transcript=false in " +
            "its listing) answers 404 and is not billed.",
        ],
    },
    request: { method: "GET", path: "/v1/podcasts/episodes/{id}/transcript" },
    input: {
        schema: {
            pathParams: zEpisodeTranscriptPathParams,
            queryParams: zEpisodeTranscriptQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
