import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * HuntAPI (www.huntapi.com). Synchronous GET endpoints against
 * `https://api.huntapi.com`, auth the `x-api-key` header.
 *
 * Billing: HuntAPI bills 1 credit per download request; reading a job's
 * status is free (published pricing; measured in the Treg catalog run,
 * 2026-11-09). No response carries a usage receipt, so the derived fold
 * settles.
 */
export default defineProvider({
    name: "huntapi",
    meta: {
        displayName: "HuntAPI",
        summary:
            "Download the video or audio of public media URLs, as background jobs.",
        description:
            "A media download API: give it a public video URL (YouTube, " +
            "TikTok, Instagram, Vimeo, X, Reddit and more) and it downloads " +
            "the video, or extracts the audio, as a background job; the " +
            "finished job returns a link to the file. Use it when an agent " +
            "has to work on the media itself, not only its page.",
        homepageUrl: "https://www.huntapi.com",
        docsUrl: "https://docs.huntapi.com",
        categories: ["youtube", "tiktok", "instagram"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.huntapi.com" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D26): one pool, the vendor's own
         *  credits. No `consolidate`: no response carries a receipt. */
        credits: { default: { label: "HuntAPI credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
