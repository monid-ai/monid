import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAurora2Body } from "./schema/inputs.ts";

/**
 * Aurora 2.0 — `POST /api/aurora/` with `model_version` pinned to
 * `aurora_v2` (`input.toRequest`), polled on `GET /api/aurora/<id>/` by
 * the provider lifecycle. Priced by RESOLUTION, one PER_UNIT·SECOND line
 * per tier; whole seconds of audio (ceil). The audio length is only known
 * once Creatify fetches the file, so the estimate holds the tier's
 * ceiling (60 s; 15 s at 2k) and the settled charge is the real length.
 * Rates are Creatify's published API price list (2026-10-22).
 */
export default defineEndpoint({
    meta: {
        displayName: "Creatify Aurora 2.0 Avatar Video",
        summary: "Turn one portrait image and up to 60 s of speech audio " +
            "into a lip-synced talking-avatar video at 480p to 2K.",
        description: "Turn one portrait image and one speech audio file " +
            "(mp3 or wav, up to 59.7 seconds) into a lip-synced " +
            "talking-avatar video with Aurora 2.0, Creatify's " +
            "second-generation avatar model: higher-fidelity lip sync, " +
            "expression and natural motion than Aurora v1, with an " +
            "optional text_prompt for mood, pose, framing and setting. " +
            "Choose the output resolution: 480p (0.4 credits per second), " +
            "720p (0.7, default), 1080p (1.4) or 2k (2.8; audio up to " +
            "14.375 seconds). The output video is exactly as long as the " +
            "audio, keeps the image's aspect ratio, and is returned as an " +
            "MP4 at video_output. Billed per whole second of audio in " +
            "Creatify API credits (1 credit = USD 0.15, so about USD 0.06 " +
            "/ 0.105 / 0.21 / 0.42 per second); the pre-run estimate holds " +
            "the tier's maximum length because the audio length is only " +
            "known once Creatify fetches the file. Suited to UGC-style " +
            "ads, spokesperson clips and product demos that need 1080p or " +
            "2K delivery. For speech longer than a minute use Creatify " +
            "Aurora; for footage without a speaking subject use Creatify " +
            "Boreal-H3.",
        docsUrl: "https://docs.creatify.ai/api-reference/aurora/post-aurora",
        categories: ["video-generation"],
        notes: [
            "The audio must be mp3 or wav of at most 59.7 seconds (14.375 " +
            "seconds at 2k) and the image png, jpg, jpeg or webp of at " +
            "least 256×256; both are fetched and copied when the job is " +
            "created, so an unreachable link or over-long track is refused " +
            "up front and costs nothing.",
            "The estimate is the tier's worst case (60 s, or 15 s at 2k, " +
            "at the tier rate); the settled charge is the audio's real " +
            "length in whole seconds.",
            "Each account has a concurrency cap on Aurora renders; a " +
            "request past it answers 429 as data (zero usage) — retry " +
            "when a render finishes.",
        ],
    },
    /** PUBLIC identity (design D22): `/api/aurora/` serves three model
     *  versions; this doc is Aurora 2.0. */
    endpoint: "/aurora-2",
    request: { method: "POST", path: "/api/aurora/" },
    input: {
        schema: {
            // the resolution is the price selector: the vendor default
            // materializes before any hook (D24/D25)
            body: zAurora2Body.extend({
                resolution: zAurora2Body.shape.resolution.unwrap()
                    .default("720p"),
            }),
        },
        /** The model version is this doc's identity, not a caller
         *  choice: pinned on the wire (the ploid posture). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model_version: "aurora_v2",
            }),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "480p_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "480p seconds",
                    description: "whole seconds of audio rendered at 480p",
                    consumes: { credit: "default", amount: 0.4 },
                },
                "720p_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "whole seconds of audio rendered at 720p",
                    consumes: { credit: "default", amount: 0.7 },
                },
                "1080p_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "whole seconds of audio rendered at 1080p",
                    consumes: { credit: "default", amount: 1.4 },
                },
                "2k_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "2k seconds",
                    description: "whole seconds of audio rendered at 2k",
                    consumes: { credit: "default", amount: 2.8 },
                },
            },
        },
        /** The audio length is not knowable before the run: hold the
         *  tier's ceiling (59.7 s → 60; 14.375 s at 2k → 15). */
        estimate: ({ data }) => {
            const res = data.input.body.resolution;
            if (res === "2k") return { counts: { "2k_second": 15 } };
            if (res === "1080p") return { counts: { "1080p_second": 60 } };
            if (res === "480p") return { counts: { "480p_second": 60 } };
            return { counts: { "720p_second": 60 } };
        },
        /** `duration` on the settled job row is the whole seconds Creatify
         *  charged for; a done job without one bills zero. */
        evidence: ({ data, utils, logger }) => {
            const raw = utils.json.optionalNum(data.output, "$.duration");
            const seconds = raw !== undefined && raw > 0 ? Math.round(raw) : 0;
            if (seconds === 0) {
                logger.warn(
                    "creatify aurora-2 job settled without a duration — zero-billing",
                    {},
                );
                return { counts: {} };
            }
            const res = data.input.body.resolution;
            if (res === "2k") return { counts: { "2k_second": seconds } };
            if (res === "1080p") return { counts: { "1080p_second": seconds } };
            if (res === "480p") return { counts: { "480p_second": seconds } };
            return { counts: { "720p_second": seconds } };
        },
    },
});
