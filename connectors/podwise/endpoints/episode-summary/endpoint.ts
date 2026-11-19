import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zEpisodeSummaryPathParams,
    zEpisodeSummaryQueryParams,
} from "./schema/inputs.ts";

/**
 * GET /api/open/v1/episodes/{seq}/summary — the AI summary, chapters and key
 * points for one episode.
 *
 * BILLED PER EPISODE. Price is the product decision recorded in the repo
 * README ($0.012 per episode read); it is set here once and the catalogue
 * prices from this file. A missing or untranscribed episode is an error
 * response, so Monid settles it at zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Podcast Episode Summary",
        summary: "AI summary of a podcast episode with timestamped chapters " +
            "and key points.",
        description: "The AI summary of one podcast episode: overview, " +
            "timestamped chapters, key points, keywords and a markdown mind " +
            'map, covering the whole episode. Answers "what was this ' +
            'podcast episode about" and "where in the episode did they ' +
            'discuss X" without reading the full transcript. Use Podcast ' +
            "Episode Transcript when you need exact quotes.",
        docsUrl:
            "https://podwise.ai/docs/open-api-v1/episodes/get-episode-summary",
        categories: ["podcasts"],
    },
    endpoint: "/episodes/summary",
    request: {
        method: "GET",
        path: "/api/open/v1/episodes/{seq}/summary",
    },
    input: {
        schema: {
            pathParams: zEpisodeSummaryPathParams,
            queryParams: zEpisodeSummaryQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.012 },
            label: "episode summary",
            description: "one episode summary read",
        },
    },
});
