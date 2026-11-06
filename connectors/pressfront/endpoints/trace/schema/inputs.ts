import { z } from "zod";

/** A screenshot or PDF of the situation, base64 with no `data:` prefix. */
export const zFile = z.object({
    mediaType: z.enum([
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "application/pdf",
    ]).describe("The file type: png, jpeg, webp, gif or pdf."),
    data: z.string().min(1).max(5_600_000).regex(/^[A-Za-z0-9+/=]+$/)
        .describe(
            "The file as base64, with no data: prefix (5.6M characters at " +
                "most each, 13M in all).",
        ),
});

/** What happened, in the caller's own words (shared with pressfront#understand). */
export const zText = z.string().min(2).max(6000).describe(
    "The situation in your own words, like 'people keep saying Lara went " +
        "partying after the concert was cancelled'. Pressfront reads it as a " +
        "name or a story and traces that. Up to 6,000 characters; the words " +
        "are never stored.",
);

/** Optional screenshots or PDFs that go with `text`. */
export const zFiles = z.array(zFile).min(1).max(5).describe(
    "Up to 5 screenshots or PDFs of the situation, read with the text " +
        "(posts in them become starting points for the search).",
);

const zName = z.string().min(1).describe(
    "A name to trace: an X @handle, an x.com profile link, or a Bluesky " +
        "handle like name.bsky.social.",
);
const zClaim = z.string().min(2).max(300).describe(
    "A story going around, in the few words people post about it, like " +
        "'Lara went partying after concert cancelled'. Words, not a link.",
);

/**
 * `POST /v1/traces` body: exactly one of `name`, `claim` or `text` (+ `files`).
 * A z.union of `.strict()` arms, the form that survives compilation as
 * `anyOf` with `additionalProperties: false` per arm (a .refine would be
 * dropped), so a body with two of them or none is refused before the metered
 * call.
 */
export const zTraceBody = z.union([
    z.object({ name: zName }).strict(),
    z.object({ claim: zClaim }).strict(),
    z.object({ text: zText, files: zFiles.optional() }).strict(),
]).describe(
    "Send exactly one: name (an X or Bluesky handle), claim (a story going " +
        "around, in a few words) or text (the situation in your own words, " +
        "with optional files).",
);
