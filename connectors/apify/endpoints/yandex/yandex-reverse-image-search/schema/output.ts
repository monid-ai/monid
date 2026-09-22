import { z } from "zod";

/**
 * johnvc/yandex-reverse-image-search — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zYandexReverseImageSearchOutputItem = z.object({
    result_type: z.enum([
        "matching_page",
        "similar_image",
        "image_size",
        "image_tag",
        "shopping_result",
        "knowledge_graph",
        "no_results",
        "error",
    ]).describe(
        "Discriminator for the row kind: 'matching_page' (a page where the image appears), 'similar_image', 'image_size' (another resolution of the same image), 'image_tag' (descriptive search term), 'shopping_result', 'knowledge_graph', 'no_results' (transparent summary when nothing matched), or 'error'.",
    ).optional(),
    position: z.number().int().describe(
        "1-based rank of this result within its result type.",
    ).optional(),
    title: z.string().describe(
        "Title of the page, image, product, or entity. Populated for 'matching_page', 'image_tag', 'shopping_result' and 'knowledge_graph' rows. Yandex returns no title for 'similar_image' or 'image_size' rows, so it is empty there.",
    ).optional(),
    link: z.string().describe(
        "URL of the page, image, or product this row points at.",
    ).optional(),
    thumbnail: z.string().describe("Thumbnail image URL for this result.")
        .optional(),
    original: z.string().describe(
        "Full-size image URL when the result carries one. Populated for 'matching_page' rows, and for 'similar_image' and 'image_size' rows where it is read back from the result link.",
    ).optional(),
    source: z.string().describe(
        "Source site or platform name for this result. Populated for 'matching_page' rows from the page's own site name, and derived from the image host for 'similar_image' and 'image_size' rows.",
    ).optional(),
    source_link: z.string().describe(
        "URL of the source site when the source was returned as an object.",
    ).optional(),
    snippet: z.string().describe(
        "Text snippet from the page where the image appears. Populated for 'matching_page' rows only. Yandex returns no snippet for any other result type.",
    ).optional(),
    thumbnail_width: z.number().int().describe(
        "Width in pixels of the thumbnail image, when Yandex reports it.",
    ).optional(),
    thumbnail_height: z.number().int().describe(
        "Height in pixels of the thumbnail image, when Yandex reports it.",
    ).optional(),
    original_width: z.number().int().describe(
        "Width in pixels of the full-size image, when Yandex reports it. Useful for picking the highest-resolution copy of an image.",
    ).optional(),
    original_height: z.number().int().describe(
        "Height in pixels of the full-size image, when Yandex reports it.",
    ).optional(),
    description: z.string().describe(
        "For 'knowledge_graph' rows: the entity blurb Yandex returns for a recognizable subject.",
    ).optional(),
    text: z.string().describe(
        "For 'image_tag' rows: the suggested search term describing the image. Also copied into 'title'.",
    ).optional(),
    size: z.string().describe(
        "For 'image_size' rows: the pixel dimensions of this alternate resolution, as reported by Yandex.",
    ).optional(),
    size_category: z.string().describe(
        "For 'image_size' rows: which size bucket this resolution belongs to (large, medium, or small).",
    ).optional(),
    image_url: z.string().describe(
        "The input image URL this reverse search was run for.",
    ).optional(),
    yandex_domain: z.string().describe(
        "The regional Yandex domain the search ran on.",
    ).optional(),
    crop: z.string().describe(
        "The crop box applied before searching, if any (left;top;right;bottom fractions).",
    ).optional(),
    search_timestamp: z.string().describe(
        "ISO 8601 timestamp of when the search was executed.",
    ).optional(),
    error_message: z.string().describe(
        "For 'error' rows: a human-readable explanation of what went wrong.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zYandexReverseImageSearchOutput = z.array(
    zYandexReverseImageSearchOutputItem.or(z.record(z.string(), z.unknown())),
);
