import { defineEndpoint } from "@shared/core";
import { imageEvidence } from "../../provider.ts";
import {
    zGenerateBody,
    zImage25Quality,
    zImageSize,
} from "../../schema/inputs.ts";
import { imageEstimate, type ImageUsageModel } from "../../schema/usage.ts";

// Price-setting knobs are required at the binding (D25).
const zBody = zGenerateBody.required({ size: true, quality: true }).extend({
    size: zImageSize,
    quality: zImage25Quality,
});

export default defineEndpoint<ImageUsageModel, typeof zBody>({
    meta: {
        displayName: "GPT Image 2.5 Sunburst",
        summary:
            "Generate a PNG with GPT Image 2.5 Sunburst from a text prompt.",
        description:
            "Generate a PNG with GPT Image 2.5 Sunburst from a text prompt. " +
            "Choose an explicit size and quality to set the output token budget. " +
            "Supports transparent PNG backgrounds and custom sizes up to 4K. " +
            "Returns data[].b64_json and the native token usage receipt. " +
            "Only a successful image is billed at the reported text/image token counts.",
        docsUrl:
            "https://developers.openai.com/api/reference/resources/images/methods/generate",
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
    endpoint: "/v1/image/gpt-image-2.5-sunburst",
    request: { method: "POST", path: "/v1/images/generations" },
    input: {
        schema: {
            body: zBody,
        },
        toRequest: ({ data, utils }) => {
            // toRequest uses raw Json typing; this fallback bridges the validated body.
            const body = data.input.body ?? {};
            return {
                ...data.input,
                body: utils.json.merge(body, {
                    model: "gpt-image-2.5-sunburst",
                    n: 1,
                    output_format: "png",
                    stream: false,
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
        }, false),
    },
});
