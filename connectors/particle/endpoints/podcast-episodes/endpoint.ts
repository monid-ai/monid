import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zPodcastEpisodesPathParams,
    zPodcastEpisodesQueryParams,
} from "./schema/inputs.ts";

/**
 * GET /v1/podcasts/{id}/episodes — a show's episodes. $0.01 per call
 * (particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29): overrides the provider's amount.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Podcast Episodes",
        summary: "A podcast's episodes, newest first, by title text, date " +
            "window and transcript status.",
        description: "List the episodes of one podcast (by slug, internal " +
            "ID or iTunes ID), newest first: each with its episode slug " +
            "and ID (the inputs to the transcript and episode endpoints), " +
            "title, description, publish date, duration, audio URL, and " +
            "whether a transcript exists. Filter by text in the title, a " +
            "publish-date window, or transcript status — including the " +
            "back catalogue Particle has discovered in the feed but not " +
            "yet transcribed. Page with cursor.",
        docsUrl:
            "https://docs.particle.pro/api-reference/podcasts/list-episodes-for-a-podcast",
        categories: ["podcasts"],
        notes: [
            "An episode without a transcript has no speakers, entities, " +
            "segments or clips: its empty lists say nothing about who was " +
            "on it or what it covered.",
        ],
    },
    request: { method: "GET", path: "/v1/podcasts/{id}/episodes" },
    input: {
        schema: {
            pathParams: zPodcastEpisodesPathParams,
            queryParams: zPodcastEpisodesQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
