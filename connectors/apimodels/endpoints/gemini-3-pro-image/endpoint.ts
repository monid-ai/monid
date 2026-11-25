import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGemini3ProImageBody } from "./schema/inputs.ts";

/**
 * Nano Banana Pro / Gemini 3 Pro Image — `model: "gemini-3-pro-image"` on apimodels'
 * `/v1/images/generations` task endpoint. List prices read 2026-11-25 from
 * https://apimodels.app/docs/gemini-image.
 */
export default defineEndpoint({
    meta: {
        displayName: "Nano Banana Pro / Gemini 3 Pro Image (apimodels)",
        summary:
            "Generate or edit images with Google's Nano Banana Pro (Gemini 3 Pro Image, GA): $0.08 per image at 1K/2K, $0.13 at 4K.",
        description:
            "Text-to-image and editing with Google's Nano Banana Pro (Gemini 3 Pro Image, the GA release) through apimodels. " +
            "Strengths: the highest fidelity and in-image text rendering in the Nano Banana family, reasoning over complex prompts, editing from reference images. " +
            "Price: $0.08 per image at 1K or 2K, $0.13 at 4K. " +
            "Limits: one image per run; with aspect_ratio auto the model picks the frame shape. " +
            "Returns resultUrls (30-day links). " +
            "Suited for: infographics and diagrams with text, detailed product renders, edits that must keep fine detail.",
        docsUrl: "https://apimodels.app/docs/gemini-image",
        categories: ["image-generation"],
    },
    endpoint: "/v1/image/gemini-3-pro-image",
    request: { method: "POST", path: "/v1/images/generations" },
    input: {
        schema: {
            // the price selector is materialized (D25) so the estimate is
            // deduced and the wire always states the tier
            body: zGemini3ProImageBody.extend({
                resolution: zGemini3ProImageBody.shape.resolution.unwrap()
                    .default("1K"),
            }),
        },
        /** Pin the model, and force the asynchronous task contract (the
         *  same path answers OpenAI-shaped clients synchronously). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "gemini-3-pro-image",
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
                    description: "$0.08 per image",
                    consumes: { credit: "default", amount: 0.08 },
                },
                "2k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "2K images",
                    description: "$0.08 per image",
                    consumes: { credit: "default", amount: 0.08 },
                },
                "4k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "4K images",
                    description: "$0.13 per image",
                    consumes: { credit: "default", amount: 0.13 },
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
