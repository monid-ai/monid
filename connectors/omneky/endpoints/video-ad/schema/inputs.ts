import { z } from "zod";
import { zOmnekyColorSwatch } from "../../../schema/common.ts";

/**
 * Faithful mirror of Omneky's `CreateVideoAdRequest`
 * (`POST /api/v1/external-api/create_video_ad_async`, published OpenAPI at
 * https://api.omneky.com/openapi.json). Optionality only; all tightening
 * lives at the binding in endpoint.ts.
 */
export const zOmnekyVideoBrandMetadata = z.object({
    brand_url: z.string().describe(
        "Brand homepage URL. Omneky scrapes it for positioning, tone, " +
            "colors and copy.",
    ).optional(),
    brand_name: z.string().describe("Brand display name.").optional(),
    brand_images: z.array(z.string()).describe(
        "Public brand image URLs, logo first when possible. Take " +
            "precedence over images inferred from brand_url.",
    ).optional(),
    color_swatches: z.array(zOmnekyColorSwatch).max(3).describe(
        "Up to 3 brand colors (primary, secondary, tertiary). Override " +
            "colors inferred from brand_url.",
    ).optional(),
});

export const zOmnekyVideoProductMetadata = z.object({
    product_url: z.string().describe(
        "Product page URL. Also used as a fallback reference image when " +
            "product_images is empty.",
    ).optional(),
    product_name: z.string().describe("Product name.").optional(),
    product_description: z.string().describe(
        "Product description, used for the narrative, script and scenes.",
    ).optional(),
    product_images: z.array(z.string()).describe(
        "Public product reference image URLs (at most 3 are used).",
    ).optional(),
});

export const zOmnekyVideoGenerationMetadata = z.object({
    aspect_ratio: z.enum(["9:16", "16:9", "1:1"]).describe(
        'Output aspect ratio. Default "9:16".',
    ).optional(),
    target_duration: z.number().int().min(10).max(15).describe(
        "Target video length in seconds, 10 to 15 inclusive.",
    ),
    locale: z.string().describe(
        'BCP-47 locale tag, e.g. "en-US" or "es-MX". Default "en-US".',
    ).optional(),
    user_prompt: z.string().describe(
        "Free-form creative direction that guides the narrative and scenes.",
    ).optional(),
});

export const zOmnekyVideoAdBody = z.object({
    brand_metadata: zOmnekyVideoBrandMetadata,
    product_metadata: zOmnekyVideoProductMetadata,
    cta: z.string().max(80).describe(
        'End-card call-to-action text, e.g. "Shop Now".',
    ).optional(),
    generation_metadata: zOmnekyVideoGenerationMetadata,
    callback_url: z.string().optional(),
});
