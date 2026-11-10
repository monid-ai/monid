import { z } from "zod";

/**
 * Mirrors shared by more than one Particle endpoint
 * (api.particle.pro/openapi.json, read 2026-10-28). Each endpoint's own
 * mirror applies the optionality; these carry the type, the documented
 * bounds and the describe. Never imported across providers.
 */
export const zLimit = z.number().int().min(1).max(100).describe(
    "Results per page (1-100). Particle's default is 25.",
);

export const zCursor = z.string().min(1).describe(
    "Opaque pagination cursor from a previous response.",
);

export const zPodcastRef = z.string().min(1).describe(
    "Podcast slug (e.g. 'all-in', 'lex-fridman-podcast'), internal ID, or " +
        "numeric iTunes ID.",
);

export const zEpisodeRef = z.string().min(1).describe("Episode slug or ID.");

export const zLanguage = z.string().min(2).describe(
    "ISO 639-1 code of the podcast's language (e.g. 'en', 'fr'). Matches " +
        "the primary subtag, so 'fr' covers 'fr-FR'.",
);

export const zDateBound = z.string().min(4).describe(
    "ISO 8601 date or date-time (e.g. 2026-01-01 or 2026-01-01T00:00:00Z).",
);

/**
 * The guest-expertise filters episode search and mentions share. Who is
 * speaking is a FILTER, never a search phrase (docs.particle.pro): an
 * everyday word such as 'doctors' resolves to the occupation it names.
 */
export const zGuestFilters = {
    guest_occupation: z.string().min(1).max(200).describe(
        "Only episodes with a guest listed under this SOC 2018 or ISCO-08 " +
            "occupation (code, slug, or title), including a SOC group or an " +
            "everyday name such as physicians or doctors.",
    ),
    guest_field: z.string().min(1).max(200).describe(
        "Only episodes with a guest listed under this ANZSRC 2020 field of " +
            "research (code, slug, or title).",
    ),
    guest_standing: z.enum(["established", "self_described", "unverified"])
        .describe(
            "Only episodes with a guest whose standing is recognized this " +
                "way: established (conferred by others), self_described, " +
                "or unverified.",
        ),
    guest_seniority: z.enum(["professional", "senior", "distinguished"])
        .describe("Only episodes with a guest at this seniority or above."),
    guest_capacity: z.enum([
        "researcher",
        "licensed_professional",
        "practitioner",
        "executive_founder",
        "public_official",
        "journalist_analyst",
        "creator_entertainer",
        "athlete_coach",
        "clergy",
        "firsthand",
        "layperson",
    ]).describe(
        "Only episodes with a guest who knows their field in this " +
            "capacity, such as executive_founder for founders. Narrows the " +
            "other guest filters.",
    ),
    guest_practicing: z.boolean().describe(
        "Only episodes with a guest who still works in the " +
            "guest_occupation given.",
    ),
    guest_in_field: z.boolean().describe(
        "Only episodes with a guest speaking within their own field.",
    ),
};
