import { z } from "zod";
import {
    zCursor,
    zDateBound,
    zLimit,
    zPodcastRef,
} from "../../../schema/common.ts";

/** GET /v1/podcasts/{id}/episodes — the vendor mirror
 *  (api.particle.pro/openapi.json `list-podcast-episodes`, 2026-10-28).
 *  The deprecated published_after/published_before aliases of since/until
 *  are not mirrored. */
export const zPodcastEpisodesPathParams = z.strictObject({ id: zPodcastRef });

export const zPodcastEpisodesQueryParams = z.strictObject({
    q: z.string().min(1).max(200).describe(
        "Only episodes whose TITLE contains this text, case-insensitively. " +
            "To search what is said inside episodes, use " +
            "particle#v1/podcasts/episodes/search.",
    ).optional(),
    since: zDateBound.describe(
        "Only episodes published after this ISO 8601 date or date-time.",
    ).optional(),
    until: zDateBound.describe(
        "Only episodes published before this ISO 8601 date or date-time.",
    ).optional(),
    transcript_status: z.enum([
        "any",
        "transcribed",
        "untranscribed",
        "requestable",
    ]).describe(
        "Where episodes stand on the way to a transcript. Omitted: the " +
            "episodes Particle has ingested. transcribed: episodes with a " +
            "transcript. any / untranscribed / requestable also list the " +
            "back catalogue discovered in the feed but not transcribed; " +
            "requestable ones can be transcribed on request.",
    ).optional(),
    limit: zLimit.optional(),
    cursor: zCursor.optional(),
});
