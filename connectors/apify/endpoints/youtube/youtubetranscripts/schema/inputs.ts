import { z } from "zod";

/**
 * johnvc/YoutubeTranscripts — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~YoutubeTranscripts/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zYoutubetranscriptsBody = z.object({
    // curated: published type ["string","array"] — one URL or a list of URLs
    youtube_url: z.union([z.string(), z.array(z.string())]).describe(
        "Required unless 'channel' is provided. Provide one YouTube URL as a string, or multiple as an array (max 100 URLs per run). Works with standard videos, Shorts, youtu.be short links, embed URLs, and m.youtube.com mobile URLs. Channel URLs (youtube.com/@handle, /channel/, /c/, /user/) are detected ...",
    ).optional(),
    languages: z.array(z.string()).describe(
        'Ordered list of ISO 639-1 language codes. The first available transcript matching one of these languages is returned. Example: ["en", "es", "fr"] tries English first, then Spanish, then French. Defaults to ["en"] when omitted.',
    ).optional(),
    translate_to: z.string().describe(
        'Optional. If set to an ISO 639-1 code (e.g. "es", "fr", "de"), the picked transcript is translated to this language. Requires the source transcript to be translatable - run with list_only=true first to see translation_languages for each available transcript. If translation is unavailable, the ori...',
    ).optional(),
    transcript_type: z.enum(["any", "manual", "generated"]).describe(
        'Filter which transcript variant to consider when both manually-created and auto-generated captions exist for a language. "any" picks whichever matches the language priority first; "manual" only considers human-made captions; "generated" only considers auto-generated.',
    ).optional(),
    output_formats: z.array(z.string()).describe(
        'Optional list of extra output formats to include in the dataset alongside the default structured fields. Allowed values: "srt" (SubRip subtitles), "vtt" (WebVTT subtitles), "text" (plain text, newline-separated). Unknown values are ignored with a warning. The structured fields (timestamped, non_t...',
    ).optional(),
    preserve_formatting: z.boolean().describe(
        "If true, keep YouTube's inline HTML formatting tags (, ) in transcript text. Default false (strips them for clean text).",
    ).optional(),
    list_only: z.boolean().describe(
        "If true, do NOT fetch any transcript. Instead, for each URL return the list of all available transcripts with their language code, generated/manual status, is_translatable flag, and translation_languages. Useful for discovering what languages exist before picking one. Not charged as a videoproces...",
    ).optional(),
    include_metadata: z.boolean().describe(
        "If true, also fetch video metadata via yt-dlp: title, description, channel_name, channel_id, channel_url, view_count, like_count, video_duration_seconds, upload_date, thumbnail_url, tags, categories, availability, was_live. Adds about 1-3 seconds per video. Successful metadata is charged as a vid...",
    ).optional(),
    // curated: published type ["string","array"] — one channel or a list
    channel: z.union([z.string(), z.array(z.string())]).describe(
        'Optional. One YouTube channel as a string, or multiple as an array. Accepts an @handle ("@mkbhd"), a bare handle ("mkbhd"), a channel ID ("UCBJycsmduvYEL83R_U4JriQ"), or any channel URL (/channel/, /c/, /user/, /@handle; a /videos, /shorts, or /streams tab URL keeps that tab). Each channel produc...',
    ).optional(),
    max_videos: z.number().int().describe(
        "Maximum number of videos to list per channel, newest first. Default 100. Values above 1000 are capped at 1000 (and values below 1 are raised to 1) with a log warning rather than failing the run. When channel_transcripts is true, at most 100 videos per run (across all channels plus explicit URLs) ...",
    ).optional(),
    channel_transcripts: z.boolean().describe(
        "If true, every video listed from the channel(s) is also queued for transcript extraction (newest first, deduplicated against youtube_url entries, subject to the 100 videos per run limit). Each successful transcript is charged as a videoprocessed event, exactly like videos passed via youtube_url. ...",
    ).optional(),
});
