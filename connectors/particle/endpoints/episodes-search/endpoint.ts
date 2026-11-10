import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEpisodesSearchQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/podcasts/episodes/search — search inside episode dialogue. $0.01 per call (particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29): overrides the amount.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Episode Dialogue",
        summary: "Search what was said inside podcast episodes, by meaning " +
            "or exact phrase, with entity, speaker and guest filters.",
        description: "Search the dialogue of 160,000+ podcasts' episodes — " +
            "by meaning (semantic_search), by exact token or quoted " +
            "phrase (keyword_search), or both at once. Each result is a " +
            "segment of an episode with the episode, the segment's " +
            "title and summary, a relevance score, bounded windows of " +
            "the matched dialogue with speaker names, and any highlight " +
            "clips that overlap it. Narrow to one podcast or episode, to " +
            "episodes featuring an entity or company, to lines spoken by " +
            "one person, to a segment type or date window, or to " +
            "episodes whose guests hold a given occupation, field, " +
            "standing or seniority. Use format=compact to screen many " +
            "results cheaply, then re-run narrowed with episode_id for " +
            "the dialogue. For every line about a person or company, use " +
            "particle#v1/podcasts/mentions instead.",
        docsUrl:
            "https://docs.particle.pro/api-reference/podcast-episode-search/search-podcast-episode-content",
        categories: ["podcasts"],
        notes: [
            "Pass semantic_search, keyword_search, or both; the other " +
            "parameters are filters.",
            "Who is speaking is a filter, never a search phrase: put a " +
            "profession in guest_occupation (an everyday word such as " +
            "'doctors' resolves) and a person or company in speaker / " +
            "entity_id / company_id, not in the query text.",
            "The speaker_statement_characteristics[...] filter (how a " +
            "line was said: certainty, sentiment, time) is not exposed " +
            "here.",
        ],
    },
    request: { method: "GET", path: "/v1/podcasts/episodes/search" },
    input: { schema: { queryParams: zEpisodesSearchQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
