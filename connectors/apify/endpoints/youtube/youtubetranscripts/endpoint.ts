import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubetranscriptsBody } from "./schema/inputs.ts";
import { zYoutubetranscriptsOutput } from "./schema/output.ts";

/**
 * johnvc/YoutubeTranscripts — Scrape YouTube Transcripts.
 *
 * PURE DATA: the async machinery (lifecycle + fromError + the generic
 * usage.evidence) is inherited leaf-wise from the apify provider; the
 * actorId is baked into the start path (owner/name → owner~name, the
 * Apify composite-id form).
 */
export default defineEndpoint({
    meta: {
        displayName: "Scrape YouTube Transcripts",
        summary:
            "Pull transcripts, subtitles, and captions for YouTube videos, " +
            "Shorts, and channels in bulk.",
        description:
            "Extracts transcripts, subtitles, and captions from YouTube " +
            "videos and Shorts by URL, or lists a channel's newest videos " +
            "and optionally transcribes them. Picks the first available " +
            "language from an ordered list, can translate to another " +
            "language, and returns plain text with optional SRT/VTT/JSON " +
            "formats and video metadata (title, channel, duration, views). " +
            "One row per video. For a single video URL with timestamps, " +
            "prefer apify#starvibe/youtube-video-transcript; use this " +
            "endpoint for bulk URL lists, channel listing, language " +
            "fallback, and optional translation.",
        docsUrl: "https://apify.com/johnvc/YoutubeTranscripts",
        categories: ["youtube"],
        notes: [
            "Billing is per video processed: a transcript fetch is one " +
            "videoprocessed event, and the metadata fetch " +
            "(include_metadata, on by default) is a second videoprocessed " +
            "event per video; list_only runs and channel listing rows are " +
            "free (actor source, 2026-09-22).",
            "Hard caps: 100 URLs per run and 1000 listed videos per " +
            "channel.",
            "youtube_url and channel each accept a single string or an " +
            "array; channel_transcripts queues every listed channel video " +
            "for transcription.",
        ],
    },
    /** PUBLIC identity (design D22): the actor's own owner/slug path,
     *  lower-cased (endpoint paths are lowercase by schema); request.path
     *  carries the Store slug verbatim (Apify resolves it case-insensitively). */
    endpoint: "/johnvc/youtubetranscripts",
    request: {
        method: "POST",
        path: "/v2/acts/johnvc~YoutubeTranscripts/runs",
    },
    // the actor's own published default run timeout exceeds the
    // provider's 300 s budget (defaultRunOptions.timeoutSecs, 2026-09-22)
    timeouts: { runMs: 1_800_000 },
    input: {
        schema: {
            body: zYoutubetranscriptsBody.extend({
                // the actor's VERIFIED published defaults (schema `default`,
                // 2026-09-22), materialized so the estimate can read them
                max_videos: zYoutubetranscriptsBody.shape.max_videos.unwrap()
                    .default(100),
                include_metadata: zYoutubetranscriptsBody.shape.include_metadata
                    .unwrap().default(true),
                channel_transcripts: zYoutubetranscriptsBody.shape
                    .channel_transcripts.unwrap().default(false),
                list_only: zYoutubetranscriptsBody.shape.list_only.unwrap()
                    .default(false),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zYoutubetranscriptsOutput },
    usage: {
        /** The WHOLE published card (design D29): every charge event the
         *  actor publishes is a line, ids normalize from the event names
         *  (D28), amounts are the Business-tier rates. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "actor start",
                    // vendor charge event: "apify-actor-start"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00001 },
                },
                videoprocessed: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "videos processed",
                    description:
                        "one per transcript fetched, plus one per metadata fetch " +
                        "when include_metadata is on",
                    // vendor charge event: "videoprocessed"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00001 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "stored rows",
                    description:
                        "the platform's per-row dataset charge — every pushed " +
                        "row, error rows included",
                    // vendor charge event: "apify-default-dataset-item"
                    // Business-tier (GOLD) price, /v2/acts pricingInfo 2026-09-22
                    consumes: { credit: "default", amount: 0.00001 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const urls = typeof body.youtube_url === "string"
                ? 1
                : (body.youtube_url?.length ?? 0);
            const channels = typeof body.channel === "string"
                ? 1
                : (body.channel?.length ?? 0);
            // channel mode lists max_videos per channel; those rows are
            // transcribed (and billed) only when channel_transcripts is on
            const listed = channels * body.max_videos;
            const transcribed = body.list_only
                ? 0
                : urls + (body.channel_transcripts ? listed : 0);
            const perVideo = body.include_metadata ? 2 : 1;
            return {
                counts: {
                    videoprocessed: transcribed * perVideo,
                    default_dataset_item: urls + listed,
                },
            };
        },
        /** OVERRIDES the provider evidence (per-line story for this card). */
        evidence: ({ data, utils }) => {
            const rows = Array.isArray(data.output) ? data.output : [];
            const body = data.input.body ?? {};
            // transcript rows bill; error rows, truncated rows and the
            // uncharged channel listing rows (result_type channel_video)
            // do not (src/main.py:800-804, :848, :923 — 2026-09-22)
            const billed = rows.filter((row) =>
                utils.json.optionalGet(row, "$.error") !== true &&
                utils.json.optionalGet(row, "$.truncated") !== true &&
                utils.json.optionalGet(row, "$.result_type") !== "channel_video"
            ).length;
            const perVideo =
                utils.json.optionalGet(body, "$.include_metadata") === false
                    ? 1
                    : 2;
            return {
                counts: {
                    videoprocessed: billed * perVideo,
                    default_dataset_item: rows.length,
                },
            };
        },
    },
});
