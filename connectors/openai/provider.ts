import { defineProvider, presets, type UsageEvidenceFn } from "@shared/core";
import { imageUsageModel } from "./schema/usage.ts";

/** Standard direct Images API rate table, checked 2026-10-17:
 * https://developers.openai.com/api/docs/pricing#image-generation-models
 * These rates also match Monid's six published OpenAI endpoint cards.
 */
export const imageEvidence = (
    { data, utils }: Parameters<UsageEvidenceFn>[0],
) => ({
    counts: {
        input_text_token: utils.json.num(
            data.output,
            "$.usage.input_tokens_details.text_tokens",
        ),
        input_image_token: utils.json.num(
            data.output,
            "$.usage.input_tokens_details.image_tokens",
        ),
        output_image_token: utils.json.num(
            data.output,
            "$.usage.output_tokens",
        ),
    },
});

export default defineProvider({
    name: "openai",
    meta: {
        displayName: "OpenAI",
        summary:
            "Generate and edit PNG images with GPT Image 2 and GPT Image 2.5.",
        description:
            "Six image endpoints: text-to-image generation and edits with " +
            "up to 16 reference images, each pinned to GPT Image 2, GPT Image 2.5 " +
            "Sunburst or GPT Image 2.5 Flare. Supports custom sizes up to 4K, " +
            "quality tiers, masks and transparent PNG backgrounds. Returns " +
            "native PNG base64; the hosting application handles artifact storage.",
        homepageUrl: "https://openai.com",
        docsUrl:
            "https://developers.openai.com/api/docs/guides/image-generation",
        categories: ["image-generation"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.openai.com" },
    timeouts: { requestMs: 180_000, runMs: 240_000 },
    usage: {
        credits: { default: { label: "US dollars" } },
        model: imageUsageModel,
        evidence: imageEvidence,
    },
    lifecycle: {
        /** Preflight cross-field size constraints in executable code: Zod
         * refinements do not survive the inert JSON Schema compilation.
         * Then relay one blocking JSON call. A malformed 2xx cannot become a
         * successful, billable run without PNG-shaped base64 and a usage receipt.
         */
        start: async ({ data, utils, logger }) => {
            const size = utils.json.str(data.input.body ?? {}, "$.size");
            const [width, height] = size.split("x").map(Number);
            const pixels = width * height;
            if (
                !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
                width % 16 !== 0 || height % 16 !== 0 ||
                Math.max(width, height) > 3840 ||
                Math.max(width, height) / Math.min(width, height) > 3 ||
                pixels < 655360 || pixels > 8294400
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 400,
                    output: {
                        error: {
                            code: "invalid_size",
                            message:
                                "Size must have 16px-aligned edges up to 3840px, " +
                                "aspect ratio at most 3:1 and 655360–8294400 pixels.",
                        },
                    },
                };
            }
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const error = utils.json.optionalGet(res.body, "$.error");
            if (error !== undefined && error !== null) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            const images = utils.json.optionalGet(res.body, "$.data");
            const text = utils.json.optionalGet(
                res.body,
                "$.usage.input_tokens_details.text_tokens",
            );
            const image = utils.json.optionalGet(
                res.body,
                "$.usage.input_tokens_details.image_tokens",
            );
            const output = utils.json.optionalGet(
                res.body,
                "$.usage.output_tokens",
            );
            const validImages = Array.isArray(images) && images.length > 0 &&
                images.every((item) =>
                    item !== null && typeof item === "object" &&
                    !Array.isArray(item) &&
                    typeof item.b64_json === "string" &&
                    item.b64_json.length % 4 === 0 &&
                    item.b64_json.startsWith("iVBORw0KGgo") &&
                    /^[A-Za-z0-9+/]+={0,2}$/.test(item.b64_json)
                );
            const validUsage = [text, image, output].every((count) =>
                typeof count === "number" && Number.isSafeInteger(count) &&
                count >= 0
            );
            if (!validImages || !validUsage) {
                logger.warn(
                    "openai returned an incomplete image or usage receipt",
                    {
                        validImages,
                        validUsage,
                    },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        error: {
                            code: "invalid_response",
                            message:
                                "OpenAI returned an incomplete image or usage receipt.",
                        },
                    },
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
