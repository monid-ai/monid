import { defineEndpoint, UsageModelKind } from "@shared/core";
import {
    zOmnekyVideoAdBody,
    zOmnekyVideoBrandMetadata,
    zOmnekyVideoGenerationMetadata,
    zOmnekyVideoProductMetadata,
} from "./schema/inputs.ts";

/**
 * POST /create_video_ad_async — one short multi-scene product video ad.
 *
 * Binding (D25): `callback_url` is omitted because Monid polls, and at
 * least one product image is required (the vendor answers 422 without one).
 */
export default defineEndpoint({
    meta: {
        displayName: "Omneky Video Ad",
        summary:
            "Generate a 10–15 second on-brand product video ad for 10 Omneky credits.",
        description: "Produce a short, multi-scene product video " +
            "advertisement. Omneky scrapes the brand and product pages for " +
            "colors and copy, writes a narrative, voiceover script and " +
            "scene breakdown from the product details and your " +
            "`generation_metadata.user_prompt`, then renders the video " +
            "from your product reference images (up to 3 used). Pick " +
            "9:16, 16:9 or 1:1, a 10–15 second target length, a locale, " +
            "and optional end-card CTA text. Returns the finished job; " +
            "`result_url` is the video. Headline, subheadline and offer " +
            "copy are not used on video; for a static ad use Omneky " +
            "/v1/image-ad instead. Each video costs 10 Omneky credits.",
        docsUrl: "https://www.omneky.com/api-docs",
        categories: ["video-generation"],
        notes: [
            "Video jobs take longer than image jobs; allow up to 45 minutes.",
        ],
    },
    endpoint: "/v1/video-ad",
    request: { method: "POST", path: "/create_video_ad_async" },
    input: {
        schema: {
            body: zOmnekyVideoAdBody.omit({ callback_url: true }).extend({
                brand_metadata: zOmnekyVideoBrandMetadata.strict(),
                product_metadata: zOmnekyVideoProductMetadata.extend({
                    product_images: zOmnekyVideoProductMetadata.shape
                        .product_images.unwrap().min(1),
                }).strict(),
                generation_metadata: zOmnekyVideoGenerationMetadata.strict(),
            }).strict(),
        },
    },
    timeouts: { requestMs: 30_000, runMs: 2_700_000, pollMs: 60_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "product video ad",
            // Omneky's published rate card (www.omneky.com/api-docs#billing):
            // "Product Animation Video with sound", 10 credits per video.
            consumes: { credit: "default", amount: 10 },
        },
    },
});
