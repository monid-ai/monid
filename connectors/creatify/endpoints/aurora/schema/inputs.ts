import { z } from "zod";
import { zAuroraBodyBase } from "../../../schema/aurora-body.ts";

/**
 * `POST /api/aurora/` on the Aurora v1 tiers — the shared body plus the
 * two knobs only v1 reads. Mirror of
 * https://docs.creatify.ai/api-reference/aurora/post-aurora, optionality
 * only (design D25).
 */
export const zAuroraBody = zAuroraBodyBase.extend({
    model_version: z.enum(["aurora_v1", "aurora_v1_fast"]).describe(
        "'aurora_v1' (default): the higher-quality tier, 1 credit per " +
            "second. 'aurora_v1_fast': renders faster at lower quality, " +
            "0.5 credits per second.",
    ).optional(),
    prompt_guidance_scale: z.number().min(0).max(10).describe(
        "How strongly text_prompt steers the render, 0 to 10 (default 1).",
    ).optional(),
});
