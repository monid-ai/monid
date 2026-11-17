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
 * GET /v1/podcasts/mentions — the vendor mirror (api.particle.pro/openapi.json
 * `search-podcast-mentions`, 2026-10-28). One of entity_id / company_id is
 * required — a cross-field rule, stated in the endpoint's notes (it cannot
 * survive compilation). The object-valued
 * `speaker_statement_characteristics[...]` filter is not mirrored (D6).
 */
export const zMentionsQueryParams = z.strictObject({
    entity_id: z.string().min(1).describe(
        "Entity slug (e.g. 'sam-altman') or ID. A person slug resolves via " +
            "the person's linked knowledge-graph entity; one with no " +
            "linked entity falls back to name matching (matched_by=name). " +
            "Required when company_id is not set.",
    ).optional(),
    company_id: z.string().min(1).describe(
        "Company slug, domain, or ID. Required when entity_id is not set; " +
            "a company with no linked entity falls back to name matching.",
    ).optional(),
    podcast_id: zPodcastRef.describe("Only mentions inside one podcast.")
        .optional(),
    publisher_id: z.string().min(1).describe(
        "Only mentions on podcasts attributed to one publisher (network), " +
            "by slug or ID.",
    ).optional(),
    episode_id: zEpisodeRef.describe(
        "Only mentions inside one episode, by slug or ID.",
    ).optional(),
    role: z.enum(["guest", "host", "panelist", "correspondent", "mention"])
        .describe(
            "How the entity participates: guest, host, panelist, " +
                "correspondent, or mention.",
        ).optional(),
    sort: z.enum(["recency", "popularity", "favorites", "strength"])
        .describe(
            "Result ordering: recency (default, most recently published " +
                "first), popularity (the parent podcast's global " +
                "popularity), favorites, or strength.",
        ).optional(),
    include_ads: z.boolean().describe(
        "Mentions inside ad reads are excluded by default; true includes " +
            "them.",
    ).optional(),
    language: zLanguage.optional(),
    since: zDateBound.describe("Only episodes published after this date.")
        .optional(),
    until: zDateBound.describe("Only episodes published before this date.")
        .optional(),
    context_lines: z.number().int().min(0).max(20).describe(
        "Surrounding dialogue lines around each mention (0-20, default 2).",
    ).optional(),
    limit: zLimit.describe(
        "Episodes per page (1-100, default 25); an episode's full set of " +
            "mention windows always lands in one page.",
    ).optional(),
    cursor: zCursor.optional(),
    guest_occupation: zGuestFilters.guest_occupation.optional(),
    guest_field: zGuestFilters.guest_field.optional(),
    guest_standing: zGuestFilters.guest_standing.optional(),
    guest_seniority: zGuestFilters.guest_seniority.optional(),
    guest_capacity: zGuestFilters.guest_capacity.optional(),
    guest_practicing: zGuestFilters.guest_practicing.optional(),
    guest_in_field: zGuestFilters.guest_in_field.optional(),
});
