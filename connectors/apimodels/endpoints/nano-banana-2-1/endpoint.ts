import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNanoBanana21Body } from "./schema/inputs.ts";

/**
 * Nano Banana 2.1 — `model: "nano-banana-2-1"` on apimodels'
 * `/v1/images/generations` task endpoint. List prices read 2026-11-25 from
 * https://apimodels.app/docs/nano-banana-2-1.
 */
export default defineEndpoint({
    meta: {
        displayName: "Nano Banana 2.1 (apimodels)",
        summary:
            "Generate or edit images with Google's Nano Banana 2.1: $0.022 / $0.036 / $0.06 per image at 1K/2K/4K, up to 10 reference images.",
        description:
            "Text-to-image, editing and multi-image composition with Google's Nano Banana 2.1 through apimodels. " +
            "Strengths: fast turnaround (about 20 s at 1K), 15 aspect ratios from 1:8 to 8:1, up to 10 reference images. " +
            "Price is set by resolution only — $0.022 (1K), $0.036 (2K), $0.06 (4K) per image; reference images are not charged extra. " +
            "Limits: one image per run, no mask or output-format options. " +
            "Returns resultUrls (30-day links) plus the actual pixel size of each image. " +
            "Suited for: high-volume generation, product and lifestyle shots, quick edits and variations.",
        docsUrl: "https://apimodels.app/docs/nano-banana-2-1",
        categories: ["image-generation"],
    },
    endpoint: "/v1/image/nano-banana-2-1",
    request: { method: "POST", path: "/v1/images/generations" },
    input: {
        schema: {
            // the price selector is materialized (D25) so the estimate is
            // deduced and the wire always states the tier
            body: zNanoBanana21Body.extend({
                resolution: zNanoBanana21Body.shape.resolution.unwrap().default(
                    "1K",
                ),
            }),
        },
        /** Pin the model, and force the asynchronous task contract (the
         *  same path answers OpenAI-shaped clients synchronously). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                model: "nano-banana-2-1",
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
                    description: "$0.022 per image",
                    consumes: { credit: "default", amount: 0.022 },
                },
                "2k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "2K images",
                    description: "$0.036 per image",
                    consumes: { credit: "default", amount: 0.036 },
                },
                "4k": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "4K images",
                    description: "$0.06 per image",
                    consumes: { credit: "default", amount: 0.06 },
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
