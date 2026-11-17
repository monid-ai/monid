import { z } from "zod";

/**
 * The flat input every video endpoint takes — the hosted catalog's contract
 * (monid-services `adaptors/topaz/endpoints/video/common.ts`). Each
 * endpoint's `toRequest` maps it onto Topaz's `POST /video/express` body.
 * Topaz does not probe the file: frame count, frame rate, and resolution
 * are the caller's to state, and Topaz fails the job (no charge) when they
 * are far off.
 *
 * Every `.describe()` sits BEFORE `.optional()` / `.default()`.
 */

/** Source containers Topaz accepts (the express `source.container` enum). */
const VIDEO_EXTENSIONS =
    "3gp|avi|dv|flv|m1v|m2t|m2ts|m2v|m4v|mkv|mov|mp4|mpeg|mpg|mts|mxf|ser|ts|vob|webm|wmv";

/** A JSON Schema `pattern` carries no flags, so case-insensitivity is
 *  spelled out: every letter becomes `[xX]`. */
const anyCase = (source: string) =>
    source.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`);

/** Where a host ends: an optional trailing dot (a URL parser drops it, so
 *  `127.0.0.1.` is 127.0.0.1), an optional port, then the path. */
const HOST_END = "\\.?(?::\\d*)?/";
/** A canonical dotted-quad octet (0-255, no leading zero). */
const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
/** One numeric host part as a URL parser reads it: decimal, octal, hex. */
const NUMERIC_PART = "(?:0[xX][0-9a-fA-F]*|\\d+)";

/**
 * Hosts the source URL may not name — monid-services' relay rule
 * (`relayUrlIssue`) as lookaheads, since a refinement does not survive
 * compilation: localhost, `*.internal`, IPv6 literals, and IPv4 loopback,
 * 0/8, private ranges and link-local. A URL parser also reads numeric
 * spellings like `2130706433` or `0x7f.1` as 127.0.0.1, so any numeric
 * host that is not a canonical dotted quad is refused too.
 *
 * The host itself may not hold `\` (a parser reads it as `/`), `%` (it
 * percent-decodes `%31%32%37` to `127`), or non-ASCII (IDNA maps
 * full-width digits to ASCII) — internationalized names pass as punycode.
 */
const BLOCKED_HOSTS = [
    "\\[",
    `(?:[^\\s/?#@:]*\\.)?${anyCase("localhost")}\\.?${HOST_END}`,
    `[^\\s/?#@:]*\\.${anyCase("internal")}\\.?${HOST_END}`,
    `127(?:\\.\\d{1,3}){3}${HOST_END}`,
    `0(?:\\.\\d{1,3}){3}${HOST_END}`,
    `10(?:\\.\\d{1,3}){3}${HOST_END}`,
    `192\\.168(?:\\.\\d{1,3}){2}${HOST_END}`,
    `172\\.(?:1[6-9]|2\\d|3[01])(?:\\.\\d{1,3}){2}${HOST_END}`,
    `169\\.254(?:\\.\\d{1,3}){2}${HOST_END}`,
    `(?!${OCTET}(?:\\.${OCTET}){3}${HOST_END})${NUMERIC_PART}` +
    `(?:\\.${NUMERIC_PART}){0,3}${HOST_END}`,
];

export const zVideoUrl = z.string().max(2000).regex(
    new RegExp(
        "^[hH][tT][tT][pP][sS]://(?:[^\\s/?#@\\\\]*@)?" +
            `(?!${BLOCKED_HOSTS.join("|")})` +
            // the host: printable ASCII minus # % / ? @ and backslash
            '[!"$&-.0->A-\\[\\]-~]+' +
            `/[^\\s?#]*\\.(${anyCase(VIDEO_EXTENSIONS)})` +
            "(?:[?#][^\\s]*)?$",
    ),
    "must be a public https:// URL whose path ends with a video extension",
).describe(
    "Public https:// URL of the source video; the path must end with a " +
        "video extension (.mp4, .mov, .mkv, .webm, ...). Topaz downloads it " +
        "directly. Max 100 GB.",
);

export const zPixels = z.number().int().min(1).max(16384);

/** One model choice: its upstream id and a one-line description. */
export interface VideoModel {
    id: string;
    label: string;
}

/** The model enum, described before its default (the binding's only knob
 *  on multi-model endpoints). */
export function zModel(models: readonly VideoModel[], fallback: string) {
    const ids = models.map((m) => m.id) as [string, ...string[]];
    return z.enum(ids).describe(
        "Model: " + models.map((m) => `${m.id} (${m.label})`).join("; ") +
            `. Default ${fallback}.`,
    ).default(fallback);
}

const source = {
    video_url: zVideoUrl,
    frame_count: z.number().int().min(1).describe(
        "Total frames in the source video, e.g. 120 for a 5-second " +
            "24 fps clip. Topaz needs it to size the job; it also sets " +
            "the credit hold.",
    ),
    frame_rate: z.number().positive().max(240).describe(
        "Source frame rate in frames per second, e.g. 24, 25, 30.",
    ),
    width: zPixels.describe("Source width in pixels, e.g. 1280."),
    height: zPixels.describe("Source height in pixels, e.g. 720."),
    keep_audio: z.boolean().describe(
        "Copy the source audio track into the output (AAC). Default true; a " +
            "silent source stays silent.",
    ).default(true),
};

/** Upscalers: the output size is REQUIRED. */
export const zUpscaleBody = z.object({
    ...source,
    output_width: zPixels.describe(
        "Output width in pixels, e.g. 1920 (HD), 3840 (4K), 1080 (portrait " +
            "HD). Keep the source aspect ratio.",
    ),
    output_height: zPixels.describe(
        "Output height in pixels, e.g. 1080 (HD), 2160 (4K), 1920 (portrait " +
            "HD). Larger than 1920x1080 in either orientation bills at the " +
            "4K rate.",
    ),
}).strict();

/** Everything else: the output size defaults to the source size. */
export const zSameSizeBody = z.object({
    ...source,
    output_width: zPixels.describe(
        "Output width in pixels. Default: the source width.",
    ).optional(),
    output_height: zPixels.describe(
        "Output height in pixels. Default: the source height.",
    ).optional(),
}).strict();
