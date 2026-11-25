import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGptImage2Body } from "./schema/inputs.ts";

/**
 * GPT Image 2 — `model: "gpt-image-2"` on apimodels'
 * `/v1/images/generations` task endpoint. List prices read 2026-11-25 from
 * https://apimodels.app/docs/gpt-image-2.
 */
export default defineEndpoint({
    meta: {
        displayName: "GPT Image 2 (apimodels)",
        summary:
            "Generate or edit images with OpenAI GPT Image 2 at native 1K/2K/4K: $0.025 / $0.03 / $0.05 per image, up to 16 reference images.",
        description:
            "Text-to-image and multi-image editing with OpenAI GPT Image 2 through apimodels. " +
            "Strengths: legible in-image text, faithful edits from up to 16 reference images, native 1K / 2K / 4K output. " +
            "Price is set by resolution only — $0.025 (1K), $0.03 (2K), $0.05 (4K) per image; aspect ratio and prompt length do not change it. " +
            "Limits: one image per run, 5:4 and 4:5 are 1K-only, text-to-image with aspect_ratio auto returns a square. " +
            "Returns resultUrls (30-day links) plus the actual pixel size of each image. " +
            "Suited for: posters and ads with text, product shots, UI and slide visuals, consistent edits.",
        docsUrl: "https://apimodels.app/docs/gpt-image-2",
        categories: ["image-generation"],
        notes: [
            "aspect_ratio 5:4 and 4:5 are supported at 1K only — at 2K or 4K the request is rejected (not charged); use 4:3 or 3:4 instead.",
            "Writing a ratio in the prompt has no effect; set aspect_ratio.",
        ],
    },
    endpoint: "/v1/image/gpt-image-2",
    request: { method: "POST", path: "/v1/images/generations" },
    input: {
        schema: {
            // the price selector is materialized (D25) so the estimate is
            // deduced and the wire always states the tier
            body: zGptImage2Body.extend({
                resolution: zGptImage2Body.shape.resolution.unwrap().default(
                    "1K",
                ),
            }),
        },
        /** Pin the model, and force the asynchronous task contract (the
         *  same path answers OpenAI-shaped clients synchronously). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "gpt-image-2",
                async: true,
            }),
        }),
    },
    usage: {
        /** Per image, by output tier — the public list rate. The completed
         *  task's own `credits` receipt settles (provider consolidate). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "1k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "1K images",
                    description: "$0.025 per image",
                    consumes: { credit: "default", amount: 0.025 },
                },
                "2k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "2K images",
                    description: "$0.03 per image",
                    consumes: { credit: "default", amount: 0.03 },
                },
                "4k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "4K images",
                    description: "$0.05 per image",
                    consumes: { credit: "default", amount: 0.05 },
                },
            },
        },
        estimate: ({ data }) => {
            const r = data.input.body.resolution;
            return {
                counts: { [r === "4K" ? "4k" : r === "2K" ? "2k" : "1k"]: 1 },
            };
        },
        /** Delivered images (resultUrls), on the tier the REQUEST chose. */
        evidence: ({ data, utils, logger }) => {
            const urls = utils.json.optionalGet(data.output, "$.resultUrls");
            const images = Array.isArray(urls)
                ? urls.filter((u) => typeof u === "string" && u !== "").length
                : 0;
            if (images === 0) {
                logger.warn(
                    "apimodels image task settled without a result url — zero-billing",
                );
                return { counts: {} };
            }
            const r = data.input.body.resolution;
            return {
                counts: {
                    [r === "4K" ? "4k" : r === "2K" ? "2k" : "1k"]: images,
                },
            };
        },
    },
});
