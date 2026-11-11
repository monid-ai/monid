import { defineEndpoint } from "@shared/core";
import { imageEvidence } from "../../provider.ts";
import {
    zEditBody,
    zImage25Quality,
    zImageSize,
    zPublicImages,
    zPublicMask,
} from "../../schema/inputs.ts";
import { imageEstimate, type ImageUsageModel } from "../../schema/usage.ts";

// Price-setting knobs are required at the binding (D25).
const zBody = zEditBody.required({ size: true, quality: true }).extend({
    size: zImageSize,
    quality: zImage25Quality,
    images: zPublicImages,
    mask: zPublicMask.optional(),
});

export default defineEndpoint<ImageUsageModel, typeof zBody>({
    meta: {
        displayName: "GPT Image 2.5 Sunburst Edit",
        summary:
            "Edit or compose a PNG with GPT Image 2.5 Sunburst and up to 16 reference images.",
        description:
            "Edit or compose a PNG with GPT Image 2.5 Sunburst and up to 16 reference images. " +
            "Choose an explicit size and quality to set the output token budget. " +
            "Supports transparent PNG backgrounds and custom sizes up to 4K. " +
            "Returns data[].b64_json and the native token usage receipt. " +
            "Only a successful image is billed at the reported text/image token counts.",
        docsUrl:
            "https://developers.openai.com/api/reference/resources/images/methods/edit",
        categories: ["image-generation"],
        notes: [
            "Generation can take up to two minutes at the highest quality tiers.",
            "Output is inline PNG base64; signed download links require host artifact storage.",
            "The estimate uses the official output token formula, a byte-based prompt " +
            "estimate and 1,500 tokens per reference image (including a mask, if present). " +
            "Actual billing uses only the response usage receipt.",
            "Vendor errors, including moderation and unreachable references, settle at zero.",
        ],
    },
    endpoint: "/v1/image/gpt-image-2.5-sunburst-edit",
    request: { method: "POST", path: "/v1/images/edits" },
    input: {
        schema: {
            body: zBody,
        },
        toRequest: ({ data, utils }) => {
            // toRequest uses raw Json typing; the fallback and array guard bridge
            // the schema-validated body without changing the shared hook ABI.
            const body = data.input.body ?? {};
            const mask = utils.json.optionalStr(body, "$.mask");
            const images = utils.json.get(body, "$.images");
            if (!Array.isArray(images)) {
                throw new Error("validated images must be an array");
            }
            return {
                ...data.input,
                body: utils.json.merge(body, {
                    model: "gpt-image-2.5-sunburst",
                    n: 1,
                    output_format: "png",
                    stream: false,
                    images: images.map((
                        image_url,
                    ) => ({ image_url })),
                    ...(mask === undefined
                        ? {}
                        : { mask: { image_url: mask } }),
                }),
            };
        },
    },
    usage: {
        evidence: imageEvidence,
        estimate: imageEstimate({
            low: 16,
            medium: 24,
            high: 48,
            xhigh: 64,
            max: 96,
        }, true),
    },
});
