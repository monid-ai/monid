import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import {
    zOmnekyImageAdBody,
    zOmnekyImageBrandMetadata,
    zOmnekyImageGenerationMetadata,
    zOmnekyImageProductMetadata,
} from "./schema/inputs.ts";

/**
 * POST /create_image_ad_async — one brand-aligned image ad per run.
 *
 * Binding (D25): `no_of_ads` and `job_ids` are omitted, so a run is exactly
 * one job; `callback_url` is omitted because Monid polls. `resolution` is a
 * PRICE SELECTOR: the two values Omneky publishes a price for ("1K", "4K"),
 * defaulted to the vendor default "1K" and `generation_metadata` prefaulted
 * so the selector always materializes for the estimate. `product_images` is
 * required whenever `product_metadata` is sent (the vendor rejects its
 * absence).
 */
const zGen = zOmnekyImageGenerationMetadata.extend({
    resolution: z.enum(["1K", "4K"]).describe(
        'Output resolution, "1K" or "4K". Default "1K". Selects the rate: ' +
            "1K is 5 Omneky credits, 4K is 10.",
    ).default("1K"),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Omneky Image Ad",
        summary:
            "Generate one finished, on-brand image ad from a brand URL — 5 credits at 1K, 10 at 4K.",
        description: "Render a finished image advertisement in the brand's " +
            "own look. Omneky scrapes `brand_metadata.brand_url` (and " +
            "`product_metadata.product_url`) for logos, colors, fonts, " +
            "headlines and product details, writes an ad concept unless " +
            "you give `generation_metadata.user_direction`, and generates " +
            "the ad with your headline / subheadline / CTA / offer copy " +
            "(or copy it extracted). Explicit brand images, fonts and " +
            "colors override what it scrapes. Choose the aspect ratio, " +
            "language, text-free output, 1K or 4K resolution, and a " +
            "reference layout to emulate. Returns the finished job; " +
            "`result_url` is the ad image. One ad per call: 5 Omneky " +
            "credits at 1K, 10 at 4K. For a short product video ad use " +
            "Omneky /v1/video-ad instead.",
        docsUrl: "https://www.omneky.com/api-docs",
        categories: ["image-generation"],
        notes: [
            "Brand onboarding failures (an unreachable brand_url) do not " +
            "fail the job; generation continues with whatever was supplied.",
            "Provide brand_metadata.brand_url or brand_metadata.brand_images.",
            "4K costs twice the 1K rate (10 vs 5 Omneky credits).",
        ],
    },
    endpoint: "/v1/image-ad",
    request: { method: "POST", path: "/create_image_ad_async" },
    input: {
        schema: {
            body: zOmnekyImageAdBody.omit({
                no_of_ads: true,
                job_ids: true,
                callback_url: true,
            }).extend({
                brand_metadata: zOmnekyImageBrandMetadata.strict(),
                product_metadata: zOmnekyImageProductMetadata.required({
                    product_images: true,
                }).strict().optional(),
                generation_metadata: zGen.prefault({}),
            }).strict(),
        },
    },
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 30_000 },
    usage: {
        /** Omneky's published rate card (www.omneky.com/api-docs#billing):
         *  "Image Generation (1K quality)" 5 credits, "(4K quality)" 10.
         *  Selection is a COUNTING rule (D19): one image on the line the
         *  request's resolution selects. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                image_1k: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "1K image ads",
                    description: "5 Omneky credits per 1K image ad",
                    consumes: { credit: "default", amount: 5 },
                },
                image_4k: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "4K image ads",
                    description: "10 Omneky credits per 4K image ad",
                    consumes: { credit: "default", amount: 10 },
                },
            },
        },
        /** The hold is one image at the requested resolution. */
        estimate: ({ data }) => {
            const key = data.input.body.generation_metadata.resolution ===
                    "4K"
                ? "image_4k"
                : "image_1k";
            return { counts: { [key]: 1 } };
        },
        /** A SUCCESS job is one image, keyed from the REQUEST (the status
         *  body echoes no settings). Errors never reach evidence. */
        evidence: ({ data }) => {
            const key = data.input.body.generation_metadata.resolution ===
                    "4K"
                ? "image_4k"
                : "image_1k";
            return { counts: { [key]: 1 } };
        },
    },
});
