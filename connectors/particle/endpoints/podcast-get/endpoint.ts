import { defineEndpoint } from "@shared/core";
import {
    zPodcastGetPathParams,
    zPodcastGetQueryParams,
} from "./schema/inputs.ts";

/**
 * GET /v1/podcasts/{id} — one show. $0.003 per call (particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29): inherits the provider's PER_CALL. The engine substitutes
 * `{id}` from pathParams before the call.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Podcast",
        summary: "One podcast by slug or ID: profile, topics, format, " +
            "popularity and optional related shows and coverage.",
        description: "Read a single podcast by its slug (e.g. 'all-in'), " +
            "internal ID or iTunes ID: title, description, language, " +
            "image, episode count, popularity percentile, political " +
            "context, aggregated topics, production format and guest " +
            "frequency, and bias and brand-suitability pointers. Ask for " +
            "more with include: related shows, the guests it could book " +
            "next, the sponsors it could pitch, how much of its history " +
            "is transcribed, and how its lines tend to be said. Use it " +
            "after particle#v1/podcasts/search has given you the slug.",
        docsUrl:
            "https://docs.particle.pro/api-reference/podcasts/get-a-podcast",
        categories: ["podcasts"],
        notes: [
            "include=recommended_sponsors is premium-grade and needs a plan " +
            "with premium endpoints; without one the call answers 402 " +
            "premium_required and is not billed.",
        ],
    },
    request: { method: "GET", path: "/v1/podcasts/{id}" },
    input: {
        schema: {
            pathParams: zPodcastGetPathParams,
            queryParams: zPodcastGetQueryParams,
        },
    },
});
