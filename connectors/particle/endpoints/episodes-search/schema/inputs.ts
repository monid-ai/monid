import { z } from "zod";
import {
    zCursor,
    zDateBound,
    zEpisodeRef,
    zGuestFilters,
    zLanguage,
    zLimit,
    zPodcastRef,
} from "../../../schema/common.ts";

/**
 * GET /v1/podcasts/episodes/search — the vendor mirror
 * (api.particle.pro/openapi.json `search-episodes`, 2026-10-28). The
 * object-valued `speaker_statement_characteristics[...]` filter is not
 * mirrored: the engine sends scalar query values only (design D6).
 */
export const zEpisodesSearchQueryParams = z.strictObject({
    semantic_search: z.string().min(1).max(500).describe(
        "Search dialogue by meaning: describe the topic the way you'd " +
            "describe it to a colleague; paraphrase-tolerant. Describe a " +
            "topic, not a name (filter people and companies with " +
            "entity_id / company_id) and not a tone. Combine with " +
            "keyword_search for hybrid ranking.",
    ).optional(),
    keyword_search: z.string().min(1).max(500).describe(
        "BM25 lexical search over dialogue for tokens that must appear " +
            "verbatim (tickers, drug names, product codes). Wrap a token " +
            "sequence in double quotes to require it adjacent and in " +
            "order; several quoted phrases AND together.",
    ).optional(),
    keyword_match: z.enum(["required", "ranked"]).describe(
        "How unquoted keyword_search terms apply: required (default) " +
            "keeps only segments containing every term; ranked lets " +
            "segments with more of the terms rank higher.",
    ).optional(),
    entity_id: z.string().min(1).describe(
        "Entity or person slug or ID: only episodes featuring this " +
            "entity. A person with no linked entity matches the episodes " +
            "they speak in.",
    ).optional(),
    entity_type: z.string().min(1).describe(
        "Entity category slug (e.g. 'company', 'school', 'book'): only " +
            "episodes that mention any entity in that category.",
    ).optional(),
    company_id: z.string().min(1).describe(
        "Company slug, domain, or ID; resolves to the company's linked " +
            "entity and applies as a filter.",
    ).optional(),
    speaker: z.string().min(1).describe(
        "Person slug or ID (an entity slug or ID works too): keeps only " +
            "segments in which this person speaks a line, and only their " +
            "lines can be a window's match.",
    ).optional(),
    episode_id: zEpisodeRef.describe("Only this episode, by slug or ID.")
        .optional(),
    podcast_id: zPodcastRef.describe(
        "Only this podcast: slug, internal ID, or numeric iTunes ID.",
    ).optional(),
    type: z.enum([
        "INTRO",
        "PERSONAL_BANTER",
        "TOPIC_DISCUSSION",
        "INTERVIEW",
        "TRANSITION",
        "AD",
        "OUTRO",
    ]).describe("Segment type filter.").optional(),
    role: z.enum([
        "guest",
        "host",
        "panelist",
        "correspondent",
        "speaker",
        "mention",
    ]).describe(
        "How the entity must relate to the episode: a speaking role " +
            "(guest, host, panelist, correspondent, or speaker for any of " +
            "them) or mention (talked about).",
    ).optional(),
    language: zLanguage.optional(),
    since: zDateBound.describe(
        "Only segments from episodes published after this date.",
    ).optional(),
    until: zDateBound.describe(
        "Only segments from episodes published on or before this date; a " +
            "bare date includes the whole day.",
    ).optional(),
    sort: z.enum(["relevance", "recency"]).describe(
        "Sort order; relevance is the default.",
    ).optional(),
    format: z.enum(["full", "compact"]).describe(
        "full (default) carries each match's bounded dialogue windows and " +
            "overlapping clips; compact omits them, returns a fraction of " +
            "the size and sooner, keeping episode, segment and relevance " +
            "score — use it to screen many results.",
    ).optional(),
    context: z.number().int().min(1).max(15).describe(
        "Lines of surrounding dialogue around each matched line (1-15, " +
            "default 1). Ignored when format=compact.",
    ).optional(),
    limit: zLimit.optional(),
    cursor: zCursor.optional(),
    guest_occupation: zGuestFilters.guest_occupation.optional(),
    guest_field: zGuestFilters.guest_field.optional(),
    guest_standing: zGuestFilters.guest_standing.optional(),
    guest_seniority: zGuestFilters.guest_seniority.optional(),
    guest_capacity: zGuestFilters.guest_capacity.optional(),
    guest_practicing: zGuestFilters.guest_practicing.optional(),
    guest_in_field: zGuestFilters.guest_in_field.optional(),
});
