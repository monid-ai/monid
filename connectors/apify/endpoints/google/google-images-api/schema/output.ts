import { z } from "zod";

/**
 * johnvc/google-images-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleImagesApiOutputItem = z.object({
    query: z.string().describe(
        "The search query this image was returned for.",
    ).optional(),
    position: z.number().int().describe(
        "Rank of the image within the results for its query.",
    ).optional(),
    title: z.string().describe(
        "Title or alt text of the image as shown on the results page.",
    ).optional(),
    imageUrl: z.string().describe("Direct URL to the full-size image file.")
        .optional(),
    imageWidth: z.number().int().describe(
        "Width of the full-size image in pixels.",
    ).optional(),
    imageHeight: z.number().int().describe(
        "Height of the full-size image in pixels.",
    ).optional(),
    thumbnailUrl: z.string().describe(
        "URL to a small thumbnail preview of the image.",
    ).optional(),
    thumbnailWidth: z.number().int().describe(
        "Width of the thumbnail in pixels.",
    ).optional(),
    thumbnailHeight: z.number().int().describe(
        "Height of the thumbnail in pixels.",
    ).optional(),
    source: z.string().describe("Name of the website the image was found on.")
        .optional(),
    domain: z.string().describe("Domain of the website hosting the image.")
        .optional(),
    link: z.string().describe("URL of the web page where the image appears.")
        .optional(),
    googleUrl: z.string().describe(
        "Google reference URL for the image result.",
    ).optional(),
    error_message: z.string().describe(
        "Present only on error rows; explains why a request could not be completed.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleImagesApiOutput = z.array(
    zGoogleImagesApiOutputItem.or(z.record(z.string(), z.unknown())),
);
