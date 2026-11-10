import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zClipPathParams } from "./schema/inputs.ts";

/** GET /broll/{videoId} — one clip's details and price. Free. */
export default defineEndpoint({
    meta: {
        displayName: "Get UGC Clip Details",
        summary: "Get one UGC clip's details, preview and price.",
        description: "Get one clip by id (from dansugc#broll): title, " +
            "description, duration, emotion and creator attributes, the " +
            "watermarked preview, and `price` in DansUGC credits for this " +
            "account. `download_url` is present only when the account " +
            "already owns the clip. Free.",
        docsUrl: "https://dansugc.com/docs#tag/b-roll/GET/broll/{videoId}",
        categories: ["stock-media"],
    },
    endpoint: "/broll/{videoId}",
    request: { method: "GET", path: "/broll/{videoId}" },
    input: { schema: { pathParams: zClipPathParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
