import { z } from "zod";

/**
 * johnvc/apple-app-store-reviews-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zAppleAppStoreReviewsApiOutputItem = z.object({
    position_global: z.number().int().describe("Global Position").optional(),
    position_on_page: z.number().int().describe("Position on Page")
        .optional(),
    review_id: z.string().describe("Review ID").optional(),
    review_title: z.string().describe("Review Title").optional(),
    review_text: z.string().describe("Review Text").optional(),
    rating: z.number().int().describe("Star Rating (1 to 5)").optional(),
    review_date: z.string().describe("Review Date (as returned)").optional(),
    review_date_iso: z.string().describe("Review Date (ISO 8601)").optional(),
    reviewed_version: z.string().describe("App Version Reviewed").optional(),
    helpfulness_text: z.string().describe("Helpfulness (prose)").optional(),
    helpful_count: z.number().int().describe("Helpful Votes").optional(),
    total_helpful_count: z.number().int().describe("Total Helpfulness Votes")
        .optional(),
    author_name: z.string().describe("Author Name").optional(),
    author_id: z.string().describe("Author ID").optional(),
    product_id: z.string().describe("Apple Product ID").optional(),
    app_platform: z.string().describe("App Platform (ios / macos)")
        .optional(),
    app_country: z.string().describe("Country Store").optional(),
    sort_order: z.string().describe("Sort Order Applied").optional(),
    page_number: z.number().int().describe("Source Page Number").optional(),
    total_page_count: z.number().int().describe("Total Pages Available")
        .optional(),
    reviews_for_current_version: z.number().int().describe(
        "Reviews for Current Version (macOS)",
    ).optional(),
    fetch_timestamp: z.string().describe("Fetch Timestamp").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zAppleAppStoreReviewsApiOutput = z.array(
    zAppleAppStoreReviewsApiOutputItem.or(z.record(z.string(), z.unknown())),
);
