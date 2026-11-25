import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSeedance20Body } from "./schema/inputs.ts";

/**
 * Seedance 2.0 — `model: "seedance-2.0"` on apimodels' `/v1/video/generations`
 * task endpoint. ByteDance bills this model on generation tokens; apimodels
 * publishes per-second list rates by resolution (480p $0.092, 720p $0.197,
 * 1080p $0.492, read 2026-11-25 from
 * https://apimodels.app/docs/seedance-2-0-official). The rate card below is
 * that list; the completed task's own `credits` receipt settles the run.
 */
const zBody = zSeedance20Body;

export default defineEndpoint({
    meta: {
        displayName: "Seedance 2.0 (apimodels)",
        summary:
            "Generate 4-15 s video with native audio from text, frames or up to 9 reference images with ByteDance Seedance 2.0: from $0.092/s at 480p.",
        description:
            "Text-to-video, image-to-video and reference-guided video with ByteDance Seedance 2.0 through apimodels, without a Volcengine or BytePlus account. " +
            "Strengths: native synchronized audio, first/last-frame control, up to 9 reference images for consistent characters and products, 480p to 1080p. " +
            "Price per second of video: $0.092 (480p), $0.197 (720p), $0.492 (1080p). " +
            "Limits: 4-15 s clips, generation takes several minutes at 1080p, raw photos of real people may be refused by moderation. " +
            "Returns resultUrls (MP4, 30-day link). " +
            "Suited for: ads and product videos, character-consistent shorts, music and dialogue scenes.",
        docsUrl: "https://apimodels.app/docs/seedance-2-0-official",
        categories: ["video-generation"],
        notes: [
            "Billing follows the generation tokens the model actually used; the per-second rates are the published list values, and the completed task reports the exact amount charged.",
            "last_frame_url requires first_frame_url; with a first frame the aspect ratio follows the frame.",
            "A real-person photo passed as a reference that trips moderation is retried once automatically through the platform's asset library.",
        ],
    },
    endpoint: "/v1/video/seedance-2.0",
    request: { method: "POST", path: "/v1/video/generations" },
    input: {
        schema: {
            // both price selectors materialized at the vendor defaults
            // (720p, 8 s) so the estimate is deduced and the wire states them
            body: zBody.extend({
                resolution: zBody.shape.resolution.unwrap().default("720p"),
                duration: zBody.shape.duration.unwrap().default(8),
            }),
        },
        /** Pin the model. */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "seedance-2.0",
            }),
        }),
    },
    // 1080p / 15 s jobs run several minutes
    timeouts: { runMs: 1_800_000, pollMs: 10_000 },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "480p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "480p seconds",
                    description: "$0.092 per second of video",
                    consumes: { credit: "default", amount: 0.092 },
                },
                "720p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "720p seconds",
                    description: "$0.197 per second of video",
                    consumes: { credit: "default", amount: 0.197 },
                },
                "1080p": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1080p seconds",
                    description: "$0.492 per second of video",
                    consumes: { credit: "default", amount: 0.492 },
                },
            },
        },
        /** The requested seconds on the requested resolution line. */
        estimate: ({ data }) => {
            const b = data.input.body;
            return { counts: { [b.resolution]: b.duration } };
        },
        /** The derived cross-check: requested seconds, keyed from the
         *  REQUEST — only once a video was delivered. */
        evidence: ({ data, utils, logger }) => {
            const urls = utils.json.optionalGet(data.output, "$.resultUrls");
            const delivered = Array.isArray(urls) &&
                urls.some((u) => typeof u === "string" && u !== "");
            if (!delivered) {
                logger.warn(
                    "apimodels video task settled without a result url — zero-billing",
                );
                return { counts: {} };
            }
            const b = data.input.body;
            return { counts: { [b.resolution]: b.duration } };
        },
    },
});
