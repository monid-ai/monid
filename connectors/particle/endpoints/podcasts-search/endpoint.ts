import { defineEndpoint } from "@shared/core";
import { zPodcastsSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/podcasts/search — the canonical podcast search. $0.003 per call
 * (particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29): inherits the provider's PER_CALL.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Podcasts",
        summary: "Find podcasts by name, with topic, language, format and " +
            "audience filters.",
        description: "Search Particle's catalog of 160,000+ podcasts by " +
            "show name — forgiving of typos, extra words and pasted " +
            "episode titles — or list shows by popularity filtered by " +
            "topic, language, brand-suitability tier, production format, " +
            "guest frequency, episode length and cadence, publishing " +
            "status, and the expertise of the guests they book. Each " +
            "result carries the show's slug (the input to every other " +
            "podcast endpoint), description, language, popularity, " +
            "format signals and a match_quality that says how confident " +
            "the match is. Start here when an agent has a show name; to " +
            "search what is said inside episodes use " +
            "particle#v1/podcasts/episodes/search.",
        docsUrl:
            "https://docs.particle.pro/api-reference/podcasts/search-podcasts",
        categories: ["podcasts"],
        notes: [
            "q is optional: without it, sort=popularity lists the catalog " +
            "by popularity, narrowed by whatever filters are set.",
            "popularity_threshold applies only to currently-charting " +
            "shows; a high threshold with a narrow topic_id can return " +
            "nothing — lower or remove it to widen the set.",
        ],
    },
    request: { method: "GET", path: "/v1/podcasts/search" },
    input: { schema: { queryParams: zPodcastsSearchQueryParams } },
});
