import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEpisodeInfoPathParams } from "./schema/inputs.ts";

/**
 * GET /api/open/v1/episodes/{seq} — metadata for one episode.
 *
 * FREE: this is the lookup step for the paid endpoints (it carries the
 * episode's `transcribed` flag, which tells an agent whether the summary and
 * transcript reads will return anything). A free entry point is also what
 * makes the catalogue usable through Monid's discover → inspect → run flow.
 */
export default defineEndpoint({
    meta: {
        displayName: "Podcast Episode Info",
        summary: "Podcast episode metadata and whether its transcript is " +
            "ready.",
        description: "Metadata for one podcast episode by its Podwise " +
            "sequence number: title, show name, publish time, duration, " +
            "language and whether the episode is transcribed. Use it as the " +
            "lookup step before reading a podcast summary or transcript, and " +
            "use Search Podcast Episodes when you only have a topic rather " +
            "than an episode id. Free.",
        docsUrl:
            "https://podwise.ai/docs/open-api-v1/episodes/get-episode-info",
        categories: ["podcasts"],
    },
    endpoint: "/episodes/info",
    request: { method: "GET", path: "/api/open/v1/episodes/{seq}" },
    input: { schema: { pathParams: zEpisodeInfoPathParams } },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
