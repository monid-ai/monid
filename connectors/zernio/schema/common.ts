import { z } from "zod";

/** Zernio ids are 24-char hex ObjectIds; anything else is a 400 upstream. */
const zObjectId = z.string().regex(/^[a-f0-9]{24}$/);

export const zProfileId = zObjectId.describe(
    "The id of a Zernio profile YOU OWN (from /create-profile or " +
        "/list-profiles).",
);

export const zAccountId = zObjectId.describe(
    "The id of a social account connected to your profile (from " +
        "/list-accounts or /connect-status).",
);

export const zPostId = zObjectId.describe(
    "The id of a post created with /create-post.",
);

/** The platforms `GET /v1/connect/{platform}` accepts for a publishing
 *  connect (the messaging, ads and workspace platforms are left out). */
export const zConnectPlatform = z.enum([
    "twitter",
    "instagram",
    "facebook",
    "linkedin",
    "tiktok",
    "youtube",
    "threads",
    "pinterest",
    "bluesky",
    "googlebusiness",
    "telegram",
    "reddit",
]);

export const zMediaItem = z.object({
    url: z.string().url().describe(
        "Publicly reachable HTTPS url of the file (upload one with " +
            "/upload-media first if you only have bytes).",
    ),
    type: z.enum(["image", "video", "gif", "document"]).optional().describe(
        "Inferred from the url extension when omitted.",
    ),
}).strict();
