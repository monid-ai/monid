import { defineEndpoint } from "@shared/core";
import { zEntitiesSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/entities/search — resolve a name to a slug. $0.003 per call
 * (particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29): inherits the provider's PER_CALL.
 */
export default defineEndpoint({
    meta: {
        displayName: "Resolve Entity",
        summary: "Turn a name, ticker, @handle or domain into the person, " +
            "company or entity slug the other endpoints take.",
        description: "Find a person, company or knowledge-graph entity " +
            "from free text — a name, partial name, nickname, stock " +
            "ticker, @handle or website domain — ranked by relevance and " +
            "tagged with a match_quality (exact, strong, contained, fuzzy, " +
            "description, speculative) so an exact identification is " +
            "distinguishable from a guess. Each result carries a top-level " +
            "type (person, company or knowledge_graph_entity) and the " +
            "matched record nested under that key; the record's slug is " +
            "what particle#v1/podcasts/mentions and the episode-search " +
            "filters take. Call it once per name; never construct a slug.",
        docsUrl:
            "https://docs.particle.pro/api-reference/entities/search-entities",
        categories: ["podcasts"],
    },
    request: { method: "GET", path: "/v1/entities/search" },
    input: { schema: { queryParams: zEntitiesSearchQueryParams } },
});
