import { z } from "zod";

/**
 * Fragments every Creatify render endpoint shares. Rates and caps that a
 * hook fn needs are written inline at the fn (closed terms cannot import).
 */

/** A media input Creatify fetches server-side when the job is created. */
export const zMediaUrl = z
    .string()
    .min(1)
    .max(2000)
    .regex(/^https?:\/\//, "must be a public http(s) URL")
    .describe(
        "Public http(s) URL (max 2000 chars) that Creatify can fetch " +
            "server-side when the job is created; data: URIs are not " +
            "accepted.",
    );

export const zTtlDays = z.number().int().min(1).max(7).describe(
    "Days the generated video is kept before automatic deletion (1-7; " +
        "deletion lands within ttl_days to ttl_days+2 days of creation). " +
        "Omit to keep the video with no expiry.",
);

export const zOutputUploadUrl = z
    .string()
    .min(1)
    .max(4096)
    .regex(/^https:\/\//, "must be an https URL")
    .describe(
        "An https presigned PUT URL you own (S3, GCS, ...). The finished " +
            "MP4 is uploaded there with Content-Type video/mp4 and deleted " +
            "from Creatify's storage, so video_output stays null. If the " +
            "upload fails the job fails and is refunded.",
    );
