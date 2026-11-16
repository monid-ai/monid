import { z } from "zod";

/**
 * johnvc/google-lens-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleLensApiOutputItem = z.object({
    resultType: z.enum(["match", "error"]).describe(
        "Discriminator for the row kind. 'match' rows are image matches, 'error' rows carry a human readable failure message.",
    ).optional(),
    searchType: z.any().describe(
        "Which lookup produced this row: visual_matches, products or exact_matches.",
    ).optional(),
    queryImage: z.any().describe(
        "The image URL that was looked up, echoed back so batched runs stay traceable.",
    ).optional(),
    position: z.any().describe(
        "Rank of this match in the result set, starting at 1.",
    ).optional(),
    title: z.any().describe(
        "Title of the page or product listing carrying the matched image.",
    ).optional(),
    source: z.any().describe(
        "Human readable name of the site the match was found on.",
    ).optional(),
    url: z.any().describe(
        "Link to the page carrying the matched image. Rendered as a clickable link.",
    ).optional(),
    thumbnail: z.any().describe(
        "Small preview of the matched image, rendered inline on the Output tab.",
    ).optional(),
    image: z.any().describe(
        "Full-resolution image URL. Present on visual and product matches. Null on exact matches, where the source returns only a thumbnail and the pixel dimensions.",
    ).optional(),
    imageWidth: z.any().describe("Pixel width of the matched source image.")
        .optional(),
    imageHeight: z.any().describe("Pixel height of the matched source image.")
        .optional(),
    date: z.any().describe(
        "Publication date of the matched page where the source reports one. Present on roughly two thirds of exact-match rows.",
    ).optional(),
    price: z.any().describe(
        "Numeric price of the product listing. Present on product matches only.",
    ).optional(),
    currency: z.any().describe("Currency symbol or code for the price field.")
        .optional(),
    inStock: z.any().describe(
        "Whether the product listing reports available stock. Present on product matches only.",
    ).optional(),
    rating: z.any().describe(
        "Average product rating out of 5, where the listing carries one. Rarely published by the source on Lens rows, so expect this to be empty most of the time.",
    ).optional(),
    reviewCount: z.any().describe(
        "Number of reviews behind the rating, where the listing carries one. Rarely published by the source on Lens rows, so expect this to be empty most of the time.",
    ).optional(),
    errorMessage: z.any().describe(
        "Human readable explanation of why the run could not return results. Present on error rows only.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleLensApiOutput = z.array(
    zGoogleLensApiOutputItem.or(z.record(z.string(), z.unknown())),
);
