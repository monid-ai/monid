import { z } from "zod";
import { zOmnekyColorSwatch } from "../../../schema/common.ts";

/**
 * Faithful mirror of Omneky's `CreateImageAdRequest`
 * (`POST /api/v1/external-api/create_image_ad_async`, published OpenAPI at
 * https://api.omneky.com/openapi.json). Optionality only; all tightening
 * lives at the binding in endpoint.ts.
 */
const zImage = z.object({
    image_url: z.string().describe("Public URL of the image."),
    description: z.string().describe("Text describing the image.").optional(),
    labels: z.array(z.string()).describe(
        'Labels for the image, e.g. ["logo"] or ["top view", "lifestyle"].',
    ).optional(),
});

export const zOmnekyImageBrandMetadata = z.object({
    brand_url: z.string().describe(
        "Brand homepage URL. Omneky scrapes it for positioning, tone, " +
            "colors, fonts, logos and copy. Provide this or brand_images.",
    ).optional(),
    brand_name: z.string().describe("Brand display name.").optional(),
    brand_images: z.array(zImage).describe(
        "Brand images (logo, lifestyle). Take precedence over images " +
            "inferred from brand_url.",
    ).optional(),
    fonts: z.array(z.string()).describe(
        "Brand font URLs. Take precedence over fonts inferred from brand_url.",
    ).optional(),
    color_swatches: z.array(zOmnekyColorSwatch).describe(
        "Brand colors. Take precedence over colors inferred from brand_url.",
    ).optional(),
});

export const zOmnekyImageProductMetadata = z.object({
    product_url: z.string().describe("Product page URL.").optional(),
    product_name: z.string().describe("Product name.").optional(),
    product_description: z.string().describe(
        "Product description, used for the ad concept when user_direction " +
            "is not given.",
    ).optional(),
    product_images: z.array(zImage).describe(
        "Product images used as visual references.",
    ).optional(),
});

export const zOmnekyAdCopy = z.object({
    copy_type: z.enum(["headline", "subheadline", "cta", "offer"]).describe(
        "Which copy slot this is.",
    ),
    copy_text: z.string().describe("The copy to show in the ad."),
    price: z.string().describe(
        "Price to display, e.g. '$29.99'. Only used with copy_type offer.",
    ).optional(),
});

export const zOmnekyImageGenerationMetadata = z.object({
    aspect_ratios: z.string().describe(
        'Output aspect ratio, e.g. "1:1" or "4:5". Default "1:1".',
    ).optional(),
    user_direction: z.string().describe(
        "Free-form creative direction. When given, Omneky skips its " +
            "automatic ad-concept step and follows this brief.",
    ).optional(),
    language: z.string().describe(
        'BCP-47 language tag, e.g. "en-us" or "es-mx". Default "en-us".',
    ).optional(),
    no_text: z.boolean().describe(
        "true renders the ad without any text. Default false.",
    ).optional(),
    resolution: z.string().describe("Output resolution.").optional(),
    reference_layouts: z.string().describe(
        "Public URL of a reference image ad whose layout to emulate.",
    ).optional(),
});

export const zOmnekyImageAdBody = z.object({
    no_of_ads: z.number().int().min(1).max(10).optional(),
    brand_metadata: zOmnekyImageBrandMetadata,
    product_metadata: zOmnekyImageProductMetadata.optional(),
    ad_copies: z.array(zOmnekyAdCopy).describe(
        "Headline, subheadline, CTA and offer copy. Omitted slots fall " +
            "back to copy extracted from the brand site.",
    ).optional(),
    generation_metadata: zOmnekyImageGenerationMetadata.optional(),
    callback_url: z.string().optional(),
    job_ids: z.array(z.string()).optional(),
});
