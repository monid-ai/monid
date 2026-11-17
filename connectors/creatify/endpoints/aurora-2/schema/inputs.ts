import { z } from "zod";
import { zAuroraBodyBase } from "../../../schema/aurora-body.ts";

/**
 * `POST /api/aurora/` on Aurora 2.0 (`model_version: "aurora_v2"`, pinned
 * at the binding) — the shared body plus the resolution selector only
 * 2.0 reads. Aurora 2.0 ignores prompt_guidance_scale, so it is not
 * mirrored here. Optionality only (design D25).
 */
export const zAurora2Body = zAuroraBodyBase.extend({
    resolution: z.enum(["480p", "720p", "1080p", "2k"]).describe(
        "Output resolution and rate per second of audio: 480p 0.4, 720p " +
            "0.7 (default), 1080p 1.4, 2k 2.8 credits. 2k takes audio up " +
            "to 14.375 seconds; the other tiers up to 59.7 seconds.",
    ).optional(),
});
