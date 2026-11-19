import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zPodcastEpisodesPathParams,
    zPodcastEpisodesQueryParams,
} from "./schema/inputs.ts";

/**
 * GET /api/open/v1/podcasts/{seq}/episodes — one show's episodes in a date
 * window.
 *
 * FREE: like Episode Info, it is the lookup step between finding a show and
 * paying to read an episode. `isRead` is the reading state of the Podwise
 * account behind the token (ours, not the caller's), so fromResponse drops it.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Podcast Episodes",
        summary: "A podcast's recent episodes, and which ones have " +
            "transcripts.",
        description: "List one podcast's episodes in a date window: the " +
            "last 7 days by default, up to 365 days back from a date you " +
            "choose. Each episode has title, publish time, duration, " +
            "language, whether it is transcribed, and the `seq` to pass to " +
            "Podcast Episode Summary or Podcast Episode Transcript. Pair it " +
            'with the summary endpoint to answer "what has this show been ' +
            'talking about lately". Free.',
        notes: [
            "Takes the show seq from Search Podcasts, not an episode seq.",
            "Only episodes with transcribed: true can be read through this " +
            "provider.",
        ],
        docsUrl:
            "https://podwise.ai/docs/open-api-v1/discovery/list-podcast-episodes",
        categories: ["podcasts"],
    },
    endpoint: "/podcasts/episodes",
    request: {
        method: "GET",
        path: "/api/open/v1/podcasts/{seq}/episodes",
    },
    input: {
        schema: {
            pathParams: zPodcastEpisodesPathParams,
            queryParams: zPodcastEpisodesQueryParams,
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["isRead"]),
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
