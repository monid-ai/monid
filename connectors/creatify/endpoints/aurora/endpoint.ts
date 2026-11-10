import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAuroraBody } from "./schema/inputs.ts";

/**
 * Aurora (v1 tiers) — `POST /api/aurora/`, polled on `GET /api/aurora/<id>/`
 * by the provider lifecycle. `model_version` stays a caller choice between
 * the two v1 tiers; Aurora 2.0 is its own doc (`creatify#aurora-2`).
 *
 * PER-SECOND BILLING on the AUDIO: the video is as long as the speech
 * track and Creatify bills whole seconds of it (ceil) at the tier's rate.
 * The audio length is only known once Creatify fetches the file, so the
 * ESTIMATE holds the tier's 5-minute ceiling (300 s) — the worst case —
 * and the settled charge is the real length (`duration` on the job row,
 * `credits_used` as the vendor claim). Rates are Creatify's published API
 * price list (2026-10-22): 1 credit/s for aurora_v1, 0.5 for aurora_v1_fast.
 */
export default defineEndpoint({
    meta: {
        displayName: "Creatify Aurora Avatar Video",
        summary: "Turn one portrait image and one speech audio file into a " +
            "lip-synced talking-avatar video (up to 5 minutes).",
        description: "Turn one portrait image and one speech audio file " +
            "(mp3 or wav, up to 5 minutes) into a lip-synced " +
            "talking-avatar video with Aurora, Creatify's avatar model: " +
            "natural lip sync, facial expression, head and body motion " +
            "driven by the audio, with an optional text_prompt for mood, " +
            "pose, framing and setting (prompt_guidance_scale 0-10). " +
            "model_version 'aurora_v1' (default) is the higher-quality " +
            "tier at 1 credit per second; 'aurora_v1_fast' renders faster " +
            "at lower quality for 0.5 credits per second. The output video " +
            "is exactly as long as the audio, keeps the image's aspect " +
            "ratio, and is returned as an MP4 at video_output. Billed per " +
            "whole second of audio in Creatify API credits (1 credit = USD " +
            "0.15); the pre-run estimate holds the 5-minute maximum " +
            "because the audio length is only known once Creatify fetches " +
            "the file, and the settled charge is the real length. Suited " +
            "to UGC-style ads, spokesperson and product-demo videos, " +
            "explainers and localized voice-overs on a presenter. For a " +
            "choice of output resolution up to 2K on clips under 60 " +
            "seconds, use Creatify Aurora 2.0; for footage without a " +
            "speaking subject, use Creatify Boreal-H3.",
        docsUrl: "https://docs.creatify.ai/api-reference/aurora/post-aurora",
        categories: ["video-generation"],
        notes: [
            "The audio must be mp3 or wav of at most 300 seconds and the " +
            "image png, jpg, jpeg or webp; both are fetched and copied " +
            "when the job is created, so an unreachable link is refused " +
            "up front and costs nothing.",
            "The estimate is the 5-minute worst case (300 s at the tier " +
            "rate); the settled charge is the audio's real length in " +
            "whole seconds.",
            "Each account has a concurrency cap on Aurora renders; a " +
            "request past it answers 429 as data (zero usage) — retry " +
            "when a render finishes.",
        ],
    },
    /** PUBLIC identity (design D22): `/api/aurora/` serves three model
     *  versions; this doc is the v1 pair. */
    endpoint: "/aurora",
    request: { method: "POST", path: "/api/aurora/" },
    input: {
        schema: {
            // vendor-documented defaults at the binding (D25); the model
            // version is the price selector, so it materializes before
            // any hook (D24)
            body: zAuroraBody.extend({
                model_version: zAuroraBody.shape.model_version.unwrap()
                    .default("aurora_v1"),
                prompt_guidance_scale: zAuroraBody.shape.prompt_guidance_scale
                    .unwrap().default(1),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "aurora_v1_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "Aurora v1 seconds",
                    description: "whole seconds of audio rendered on aurora_v1",
                    consumes: { credit: "default", amount: 1 },
                },
                "aurora_v1_fast_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "Aurora v1 Fast seconds",
                    description:
                        "whole seconds of audio rendered on aurora_v1_fast",
                    consumes: { credit: "default", amount: 0.5 },
                },
            },
        },
        /** The audio length is not knowable before the run: hold the
         *  tier's 300 s ceiling on the selected line. */
        estimate: ({ data }) => {
            if (data.input.body.model_version === "aurora_v1_fast") {
                return { counts: { "aurora_v1_fast_second": 300 } };
            }
            return { counts: { "aurora_v1_second": 300 } };
        },
        /** `duration` on the settled job row is the whole seconds Creatify
         *  charged for; a done job without one bills zero rather than
         *  guessing. */
        evidence: ({ data, utils, logger }) => {
            const raw = utils.json.optionalNum(data.output, "$.duration");
            const seconds = raw !== undefined && raw > 0 ? Math.round(raw) : 0;
            if (seconds === 0) {
                logger.warn(
                    "creatify aurora job settled without a duration — zero-billing",
                    {},
                );
                return { counts: {} };
            }
            if (data.input.body.model_version === "aurora_v1_fast") {
                return { counts: { "aurora_v1_fast_second": seconds } };
            }
            return { counts: { "aurora_v1_second": seconds } };
        },
    },
});
