import { z } from "zod";

/** Selected fields from the native Images API. Optionality stays native;
 * the six public bindings require size/quality and narrow the model's tiers.
 * Model, n, streaming and encoding are fixed at the wire boundary.
 * https://developers.openai.com/api/reference/resources/images/methods/generate
 * https://developers.openai.com/api/reference/resources/images/methods/edit
 */
export const zImageSize = z.string().regex(/^[1-9]\d*x[1-9]\d*$/).describe(
    "Output WIDTHxHEIGHT. Edges must be multiples of 16, at most 3840px; " +
        "aspect ratio at most 3:1; pixel count 655,360–8,294,400 inclusive. " +
        "Examples: 1024x1024, 1536x1024, 3840x2160.",
);

export const zImage2Quality = z.enum(["low", "medium", "high"]);
export const zImage25Quality = z.enum([
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
]);

export const zGenerateBody = z.strictObject({
    prompt: z.string().min(1).max(32000).describe(
        "Description of the image, or instruction for an edit; up to 32,000 characters.",
    ),
    size: z.union([zImageSize, z.literal("auto")]).optional(),
    quality: z.enum(["auto", "low", "medium", "high", "xhigh", "max"])
        .optional(),
    background: z.enum(["transparent", "opaque", "auto"]).describe(
        "PNG background; auto lets the model decide (the vendor default).",
    ).optional(),
});

const zImageReference = z.strictObject({
    image_url: z.string().min(1).optional(),
    file_id: z.string().min(1).optional(),
});

export const zEditBody = zGenerateBody.extend({
    images: z.array(zImageReference).min(1).max(16),
    mask: zImageReference.optional(),
});

/** The Monid facade accepts URL strings, unlike the native JSON objects.
 * This narrowing belongs to the endpoint binding, not the vendor mirror.
 */
export const zPublicImageUrl = z.url({ protocol: /^https$/ }).regex(
    /^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/,
)
    .describe("Public HTTPS URL of a PNG, WEBP or JPG under 50 MB.");
export const zPublicImages = z.array(zPublicImageUrl).min(1).max(16).describe(
    "1–16 reference images, in order. The optional mask applies to the first image.",
);
export const zPublicMask = zPublicImageUrl.describe(
    "PNG mask matching the first image's dimensions, with an alpha channel. " +
        "Transparent regions indicate the edit area; mask adherence is approximate.",
);
