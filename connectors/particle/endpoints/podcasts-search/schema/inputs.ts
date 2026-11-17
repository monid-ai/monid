import { z } from "zod";
import { zCursor, zLanguage, zLimit } from "../../../schema/common.ts";

/**
 * GET /v1/podcasts/search query params — the vendor mirror
 * (api.particle.pro/openapi.json `search-podcasts`, 2026-10-28). Scalar
 * params only (design D6): the two list filters are comma-separated
 * strings on the wire. Strict: an unknown key is INVALID_INPUT.
 */
export const zPodcastsSearchQueryParams = z.strictObject({
    q: z.string().min(1).max(200).describe(
        "Podcast name to search for. Forgiving: handles typos, missing or " +
            "extra words ('offline jon favreau'), a name plus qualifiers " +
            "('equity techcrunch'), and pasted episode titles. Each " +
            "result's match_quality says how confident the match is.",
    ).optional(),
    sort: z.enum(["relevance", "popularity"]).describe(
        "Result ordering. relevance (the default when q is present) ranks " +
            "by match quality, ties broken by popularity; popularity " +
            "orders purely by global popularity.",
    ).optional(),
    slug: z.string().min(1).max(200).describe(
        "Filter by exact podcast slug (e.g. 'all-in').",
    ).optional(),
    topic_id: z.string().min(1).describe(
        "Filter by topic ID, ancestry slug (e.g. " +
            "technology/artificial-intelligence), or ancestry path hash. " +
            "Matches podcasts where the topic accounts for at least 20% " +
            "of the show.",
    ).optional(),
    language: zLanguage.optional(),
    suitability_tier: z.enum(["SAFE", "LIMITED", "SENSITIVE", "UNSAFE"])
        .describe(
            "Filter by brand-suitability tier (IAB Tech Lab Brand Safety & " +
                "Suitability Framework) from the show's most recent " +
                "suitability analysis.",
        ).optional(),
    popularity_threshold: z.number().min(0).max(1).describe(
        "Only podcasts whose global popularity percentile is at least " +
            "this value (0-1). 0 or omitted disables the filter; when " +
            "active, shows not currently charting on Apple Podcasts are " +
            "excluded, so a high threshold with a narrow topic_id can " +
            "return nothing.",
    ).optional(),
    guest_frequency: z.string().min(1).describe(
        "Filter by how often episodes feature a guest: a comma-separated " +
            "list of never, rare, occasional, regular, always (e.g. " +
            "'regular,always' for interview-driven shows).",
    ).optional(),
    format_signal: z.string().min(1).describe(
        "Filter by detected production format: a comma-separated list of " +
            "interview, panel, call_in, solo_narrated.",
    ).optional(),
    has_ads: z.enum(["true", "false"]).describe(
        "Filter by advertiser presence. 'false' finds ad-free shows, " +
            "which needs enough analyzed episodes, so sparsely-analyzed " +
            "podcasts are excluded.",
    ).optional(),
    has_video: z.enum(["true", "false"]).describe(
        "Filter by whether episodes have discovered video versions (e.g. " +
            "YouTube releases).",
    ).optional(),
    min_avg_episode_minutes: z.number().int().min(0).max(10080).describe(
        "Only podcasts whose average episode runs at least this many " +
            "minutes.",
    ).optional(),
    max_avg_episode_minutes: z.number().int().min(0).max(10080).describe(
        "Only podcasts whose average episode runs at most this many " +
            "minutes.",
    ).optional(),
    min_episodes_per_week: z.number().min(0).describe(
        "Only podcasts publishing at least this many episodes per week on " +
            "average over the trailing 90 days (e.g. 5 for weekday " +
            "dailies).",
    ).optional(),
    max_episodes_per_week: z.number().min(0).describe(
        "Only podcasts publishing at most this many episodes per week on " +
            "average (e.g. 0.5 for fortnightly-or-slower shows).",
    ).optional(),
    publishing_status: z.enum(["active", "dormant"]).describe(
        "active = released an episode within the last 90 days; dormant = " +
            "has not.",
    ).optional(),
    guest_occupation: z.string().min(1).max(200).describe(
        "Only shows whose analyzed guests include someone listed under " +
            "this SOC 2018 or ISCO-08 occupation (code, slug, title, SOC " +
            "group, or an everyday name such as physicians).",
    ).optional(),
    guest_field: z.string().min(1).max(200).describe(
        "Only shows whose analyzed guests include someone listed under " +
            "this ANZSRC 2020 field of research (code, slug, or title).",
    ).optional(),
    min_analyzed_guest_appearances: z.number().int().min(0).describe(
        "Only shows with at least this many guest appearances analyzed " +
            "for expertise; raise it to steady the share filters.",
    ).optional(),
    min_established_guest_share: z.number().min(0).max(1).describe(
        "Only shows where at least this share (0-1) of analyzed guest " +
            "appearances are by guests whose standing others conferred.",
    ).optional(),
    min_in_field_guest_share: z.number().min(0).max(1).describe(
        "Only shows where at least this share (0-1) of analyzed guest " +
            "appearances stayed within the guest's field.",
    ).optional(),
    max_promotional_guest_share: z.number().min(0).max(1).describe(
        "Only shows where at most this share (0-1) of analyzed guest " +
            "appearances were mainly promotional; 0 keeps only shows with " +
            "none.",
    ).optional(),
    limit: zLimit.optional(),
    cursor: zCursor.optional(),
});
