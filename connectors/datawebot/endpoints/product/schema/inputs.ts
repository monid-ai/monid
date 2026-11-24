import { z } from "zod";

/** `POST /v1/requests` with capability `product` — the fields that
 *  capability reads. The vendor's schema is closed. */
export const zDatawebotProductBody = z.strictObject({
    url: z.url().max(2048).describe(
        "A product page URL on a supported shop.",
    ).optional(),
    product_id: z.string().max(4096).describe(
        "A `product_id` returned by datawebot search, passed back unchanged.",
    ).optional(),
    country: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "Two-letter country code for the market.",
    ).optional(),
    format: z.enum(["structured", "raw"]).describe(
        "`raw` adds the shop's own records where the shop has them.",
    ).optional(),
    max_credits: z.number().int().min(0).max(1_000_000).describe(
        "Budget in datawebot credits. If the price is higher, nothing " +
            "runs and nothing is charged.",
    ).optional(),
});
