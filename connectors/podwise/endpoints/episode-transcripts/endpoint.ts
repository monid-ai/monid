import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zEpisodeTranscriptsPathParams,
    zEpisodeTranscriptsQueryParams,
} from "./schema/inputs.ts";

/**
 * GET /api/open/v1/episodes/{seq}/transcripts — the full transcript.
 *
 * BILLED PER EPISODE ($0.036, the README rate card). Higher than the summary
 * because a transcript is the whole episode as text and is the endpoint most
 * likely to be re-read for quoting.
 */
export default defineEndpoint({
    meta: {
        displayName: "Podcast Episode Transcript",
        summary: "Full podcast transcript with speaker labels and timestamps.",
        description: "The full transcript of one podcast episode, line by " +
            "line, each with start and end times and the speaker when " +
            "identified. Use it to quote what a guest said, cite the minute " +
            "it was said, or run your own analysis on the conversation. " +
            "Already transcribed, so no audio download or speech-to-text is " +
            "needed.",
        notes: [
            "Speaker labels are automatic; check a quote against the audio " +
            "before attributing it publicly.",
        ],
        docsUrl:
            "https://podwise.ai/docs/open-api-v1/episodes/get-episode-transcripts",
        categories: ["podcasts", "speech"],
    },
    endpoint: "/episodes/transcripts",
    request: {
        method: "GET",
        path: "/api/open/v1/episodes/{seq}/transcripts",
    },
    input: {
        schema: {
            pathParams: zEpisodeTranscriptsPathParams,
            queryParams: zEpisodeTranscriptsQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.036 },
            label: "episode transcript",
            description: "one episode transcript read",
        },
    },
});
