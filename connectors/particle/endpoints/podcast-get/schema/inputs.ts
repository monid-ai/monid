import { z } from "zod";
import { zPodcastRef } from "../../../schema/common.ts";

/** GET /v1/podcasts/{id} — the vendor mirror (api.particle.pro/openapi.json
 *  `get-podcast`, 2026-10-28). `include` is a comma-separated list on the
 *  wire (design D6: scalar query values). */
export const zPodcastGetPathParams = z.strictObject({ id: zPodcastRef });

export const zPodcastGetQueryParams = z.strictObject({
    topic_limit: z.number().int().min(0).max(1000).describe(
        "Maximum number of aggregated topics to return (0 for none, max " +
            "1000). Particle's default is 10.",
    ).optional(),
    include: z.string().min(1).describe(
        "Optional response sections, comma-separated: related (the five " +
            "most related podcasts), recommended_guests (five guests the " +
            "show could book next), recommended_sponsors (premium-grade: " +
            "needs a plan with premium endpoints), coverage (how much of " +
            "the show's history is known and transcribed, by year), " +
            "speaker_statement_characteristics (how the show's lines are " +
            "said over the last 365 days).",
    ).optional(),
});
