import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEpisodeStatusPathParams } from "./schema/inputs.ts";

/**
 * GET /api/open/v1/episodes/{seq}/status — processing state.
 *
 * FREE. An episode becomes readable only once its status is `done`; the other
 * values are `processing`, `waiting`, `not_requested` and `failed`. Exposed so
 * an agent can check before paying for a summary or transcript read rather
 * than discovering the gap after the charge.
 */
export default defineEndpoint({
    meta: {
        displayName: "Podcast Episode Status",
        summary: "Whether a podcast episode's transcript and summary are " +
            "ready.",
        description: "Whether a podcast episode is ready to read: status is " +
            "one of done, processing, waiting, not_requested or failed, with " +
            "a 0-100 progress value while it is being processed. Check this " +
            "before calling the podcast summary or transcript endpoint; " +
            "content endpoints return nothing useful until the status is " +
            "done. Free.",
        notes: [
            "Episodes that are not processed cannot be processed through " +
            "Monid; pick another episode from search results where " +
            "transcribed is true instead of polling.",
        ],
        docsUrl:
            "https://podwise.ai/docs/open-api-v1/episodes/get-episode-status",
        categories: ["podcasts"],
    },
    endpoint: "/episodes/status",
    request: { method: "GET", path: "/api/open/v1/episodes/{seq}/status" },
    input: { schema: { pathParams: zEpisodeStatusPathParams } },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
