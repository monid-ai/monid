import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBorealH3Body } from "./schema/inputs.ts";

/**
 * Boreal-H3 — `POST /api/boreal/` with `model` pinned to `boreal-h3`
 * (`input.toRequest`), polled on `GET /api/boreal/<id>/` by the provider
 * lifecycle.
 *
 * PER-SECOND BILLING: Creatify prices boreal-h3 per second of output, per
 * resolution — one PER_UNIT·SECOND line per tier, the request selecting
 * which. Reference video adds its own seconds at a separate per-tier
 * rate (counted up to 15 s combined, and NOT reported back on the job
 * row, so both estimate and evidence hold the 15 s cap when any reference
 * video is sent — the vendor claim trues it up). Reference images beyond
 * the first five add 0.2 credits each. Creatify then rounds the WHOLE
 * price up to the next half credit, which no rate algebra expresses: the
 * `credits_used` claim is the bill, and the fold here is the cross-check
 * (expect a small `mismatch.derived` on most runs, by design).
 *
 * RATES are the live public rates on 2026-10-22: list 0.53 / 1.07 / 2.13
 * credits per second with Creatify's standing 75% launch discount applied
 * and rounded to the cent (0.13 / 0.27 / 0.53); reference inputs are not
 * discounted. Re-audit on repricing (the exa posture).
 */
export default defineEndpoint({
    meta: {
        displayName: "Creatify Boreal-H3 Video",
        summary: "Generate a 1-15 s ad-style video clip with native audio " +
            "from a prompt, a first/last frame, or reference images, video " +
            "and audio.",
        description: "Generate a 1 to 15 second video clip with native " +
            "audio using Boreal-H3, Creatify's video model for ads, " +
            "post-trained from MiniMax H3 (powered by MiniMax H3). Three " +
            "modes from one endpoint: text-to-video (prompt only), " +
            "image-to-video (image_url as the first frame, optional " +
            "end_image_url as the closing frame; the output keeps the " +
            "image's aspect ratio) and reference-to-video (up to 9 " +
            "reference_image_urls, 3 reference_video_urls and 3 " +
            "reference_audio_urls for consistent characters, products, " +
            "motion and voice — name them in the prompt as Image 1, " +
            "Video 1, Audio 1). Resolutions 768p (default), 1088p or 2k; " +
            "aspect ratios 16:9, 9:16, 1:1, 4:3, 3:4 or auto. " +
            "prompt_enhancement 'auto' rewrites the prompt the way the " +
            "model was evaluated for ads with a person on camera; send " +
            "'none' to render the prompt as written. Billed per second of " +
            "output in Creatify API credits — 0.13 at 768p, 0.27 at 1088p, " +
            "0.53 at 2k (about USD 0.02 / 0.04 / 0.08) — plus 0.4 (768p) " +
            "or 0.6 (1088p, 2k) credits per second of reference video and " +
            "0.2 credits per reference image beyond the first five; the " +
            "total is rounded up to the next half credit. Renders take " +
            "about 1-5 minutes and return an MP4 at video_output. Failed " +
            "or rejected renders are refunded. Suited to product shots, " +
            "UGC-style scenes, b-roll and short spots; when a subject must " +
            "lip-sync a given voice track, use Creatify Aurora instead.",
        docsUrl: "https://docs.creatify.ai/api-reference/boreal/post-boreal",
        categories: ["video-generation"],
        /** CROSS-field rules the compiled JSON Schema cannot express,
         *  which the API enforces itself with a free 400 (design D9). */
        notes: [
            "A reference render (any reference_image_urls or " +
            "reference_video_urls) takes no image_url or end_image_url; " +
            "end_image_url needs image_url; reference_audio_urls need at " +
            "least one image or video reference.",
            "With image_url only aspect_ratio 'auto' is accepted (the " +
            "image's own ratio wins). A 1088p render with only video " +
            "references needs a named aspect_ratio.",
            "Reference video is billed on its combined length counted up " +
            "to 15 seconds; its seconds are not reported on the job, so " +
            "the estimate holds the 15 s cap whenever reference video is " +
            "sent and the settled charge is Creatify's own figure.",
            "The whole price is rounded up to the next half credit " +
            "(a 5 s 768p clip bills 1 credit).",
        ],
    },
    /** PUBLIC identity (design D22): `/api/boreal/` also serves the
     *  Boreal v1 model, so this doc pins its own model-named identity. */
    endpoint: "/boreal-h3",
    request: { method: "POST", path: "/api/boreal/" },
    input: {
        schema: {
            // vendor-documented defaults, applied at the binding (D25);
            // resolution and duration are the price selectors, so both
            // materialize before any hook (D24)
            body: zBorealH3Body.extend({
                resolution: zBorealH3Body.shape.resolution.unwrap()
                    .default("768p"),
                aspect_ratio: zBorealH3Body.shape.aspect_ratio.unwrap()
                    .default("auto"),
                duration: zBorealH3Body.shape.duration.unwrap().default(10),
                prompt_enhancement: zBorealH3Body.shape.prompt_enhancement
                    .unwrap().default("auto"),
            }),
        },
        /** The model is this doc's identity, not a caller choice: pinned
         *  on the wire (the ploid posture); the strict schema keeps a
         *  caller-sent `model` out. */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "boreal-h3",
            }),
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "768p_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "768p seconds",
                    description: "seconds of output at 768p",
                    consumes: { credit: "default", amount: 0.13 },
                },
                "1088p_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "1088p seconds",
                    description: "seconds of output at 1088p",
                    consumes: { credit: "default", amount: 0.27 },
                },
                "2k_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "2k seconds",
                    description: "seconds of output at 2k",
                    consumes: { credit: "default", amount: 0.53 },
                },
                "768p_reference_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "reference video seconds (768p)",
                    description:
                        "seconds of reference video on a 768p render, counted up to 15",
                    consumes: { credit: "default", amount: 0.4 },
                },
                "1088p_reference_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "reference video seconds (1088p)",
                    description:
                        "seconds of reference video on a 1088p render, counted up to 15",
                    consumes: { credit: "default", amount: 0.6 },
                },
                "2k_reference_second": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.SECOND,
                    label: "reference video seconds (2k)",
                    description:
                        "seconds of reference video on a 2k render, counted up to 15",
                    consumes: { credit: "default", amount: 0.6 },
                },
                "reference_image": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reference images",
                    description:
                        "reference images beyond the first 5, which are free",
                    consumes: { credit: "default", amount: 0.2 },
                },
            },
        },
        /** The requested duration IS the output promise (whole seconds,
         *  billed as requested); reference video holds the 15 s cap
         *  because its real length is not knowable before the run. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const videos = body.reference_video_urls?.length ?? 0;
            const images = body.reference_image_urls?.length ?? 0;
            const imageLine = images > 5
                ? { "reference_image": images - 5 }
                : {};
            if (body.resolution === "2k") {
                return {
                    counts: {
                        "2k_second": body.duration,
                        ...(videos > 0 ? { "2k_reference_second": 15 } : {}),
                        ...imageLine,
                    },
                };
            }
            if (body.resolution === "1088p") {
                return {
                    counts: {
                        "1088p_second": body.duration,
                        ...(videos > 0 ? { "1088p_reference_second": 15 } : {}),
                        ...imageLine,
                    },
                };
            }
            return {
                counts: {
                    "768p_second": body.duration,
                    ...(videos > 0 ? { "768p_reference_second": 15 } : {}),
                    ...imageLine,
                },
            };
        },
        /** The settled job row echoes `duration` (the seconds Creatify
         *  charged for); a done job reporting none is an anomaly that
         *  bills zero rather than guessing. Reference lines are read off
         *  the REQUEST, as at estimate time (design D5). */
        evidence: ({ data, utils, logger }) => {
            const body = data.input.body;
            const raw = utils.json.optionalNum(data.output, "$.duration");
            const seconds = raw !== undefined && raw > 0 ? Math.round(raw) : 0;
            if (seconds === 0) {
                logger.warn(
                    "creatify boreal-h3 job settled without a duration — zero-billing",
                    {},
                );
                return { counts: {} };
            }
            const videos = body.reference_video_urls?.length ?? 0;
            const images = body.reference_image_urls?.length ?? 0;
            const imageLine = images > 5
                ? { "reference_image": images - 5 }
                : {};
            if (body.resolution === "2k") {
                return {
                    counts: {
                        "2k_second": seconds,
                        ...(videos > 0 ? { "2k_reference_second": 15 } : {}),
                        ...imageLine,
                    },
                };
            }
            if (body.resolution === "1088p") {
                return {
                    counts: {
                        "1088p_second": seconds,
                        ...(videos > 0 ? { "1088p_reference_second": 15 } : {}),
                        ...imageLine,
                    },
                };
            }
            return {
                counts: {
                    "768p_second": seconds,
                    ...(videos > 0 ? { "768p_reference_second": 15 } : {}),
                    ...imageLine,
                },
            };
        },
    },
});
