import { z } from "zod";

/** `GET /v1/instant/{handle}` path parameters. */
export const zInstantPathParams = z.object({
    handle: z.string().min(1).describe(
        "An X @handle (with or without the @), an x.com profile link, or a " +
            "Bluesky handle like name.bsky.social.",
    ),
});

/** `GET /v1/instant/{handle}` query parameters. */
export const zInstantQueryParams = z.object({
    maxAgeHours: z.number().int().min(1).max(72).optional().describe(
        "How old the newest trace may be, 1 to 72 hours. Pressfront's " +
            "default is 24. Older or none: Pressfront searches the name now.",
    ),
});
