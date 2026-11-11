import { z } from "zod";

/**
 * johnvc/naver-search-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zNaverSearchApiOutputItem = z.object({
    result_type: z.string().describe(
        "The kind of result: 'web_organic', 'ad', 'shopping', 'news', 'image', 'video', or 'error'.",
    ).optional(),
    query: z.string().describe("The search query this row was returned for.")
        .optional(),
    where: z.string().describe(
        "The Naver vertical searched: nexearch, web, news, image, or video.",
    ).optional(),
    position: z.number().int().describe(
        "Rank of this result within the query results.",
    ).optional(),
    title: z.string().describe("Title of the result.").optional(),
    link: z.string().describe("URL of the result.").optional(),
    snippet: z.string().describe("Short text excerpt, when available.")
        .optional(),
    source: z.string().describe(
        "Source site or publisher name, when available.",
    ).optional(),
    thumbnail: z.string().describe("Thumbnail image URL, when available.")
        .optional(),
    displayed_link: z.string().describe(
        "Human-readable display URL (web results).",
    ).optional(),
    description: z.string().describe("Ad description text (ad results).")
        .optional(),
    sub_title: z.string().describe("Ad sub-title (ad results).").optional(),
    site: z.string().describe("Advertiser site (ad results).").optional(),
    link_list: z.array(z.record(z.string(), z.any())).describe(
        "Additional sitelinks for an ad.",
    ).optional(),
    price: z.number().describe("Product price (shopping results).")
        .optional(),
    rating: z.number().describe("Product rating (shopping results).")
        .optional(),
    reviews: z.number().describe("Review count (shopping results).")
        .optional(),
    stores: z.string().describe("Store/offer note (shopping results).")
        .optional(),
    additional: z.array(z.record(z.string(), z.any())).describe(
        "Additional product attributes as title/value pairs (shopping results).",
    ).optional(),
    news_info: z.record(z.string(), z.any()).describe(
        "Publisher and date metadata (news results).",
    ).optional(),
    original: z.string().describe("Full-size image URL (image results).")
        .optional(),
    width: z.number().int().describe(
        "Full-size image width in pixels (image results).",
    ).optional(),
    height: z.number().int().describe(
        "Full-size image height in pixels (image results).",
    ).optional(),
    thumbnail_width: z.number().int().describe(
        "Thumbnail width in pixels (image results).",
    ).optional(),
    thumbnail_height: z.number().int().describe(
        "Thumbnail height in pixels (image results).",
    ).optional(),
    is_gif: z.boolean().describe(
        "True if the image is a GIF (image results).",
    ).optional(),
    channel: z.record(z.string(), z.any()).describe(
        "Channel/uploader metadata (video results).",
    ).optional(),
    duration: z.string().describe(
        "Video duration, e.g. '21:55' (video results).",
    ).optional(),
    views: z.string().describe("View count text (video results).").optional(),
    publish_date: z.string().describe("Publish date text (video results).")
        .optional(),
    origin: z.string().describe("Hosting platform name (video results).")
        .optional(),
    origin_link: z.string().describe("Hosting platform link (video results).")
        .optional(),
    fetched_at: z.string().describe(
        "ISO 8601 timestamp of when this row was produced.",
    ).optional(),
    error_message: z.string().describe(
        "Human-readable error description. Only present on result_type='error' rows.",
    ).optional(),
    error_type: z.string().describe("Machine-readable error category.")
        .optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zNaverSearchApiOutput = z.array(
    zNaverSearchApiOutputItem.or(z.record(z.string(), z.unknown())),
);
