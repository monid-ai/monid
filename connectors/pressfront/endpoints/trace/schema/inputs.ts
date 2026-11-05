import { z } from "zod";

/** `POST /v1/traces` body. */
export const zTraceBody = z.object({
    name: z.string().min(1).describe(
        "The name to trace: an X @handle, an x.com profile link, or a " +
            "Bluesky handle like name.bsky.social.",
    ),
});
