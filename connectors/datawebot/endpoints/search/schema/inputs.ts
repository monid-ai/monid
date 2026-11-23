import { z } from "zod";

/** `POST /v1/requests` with capability `search` — the fields that capability
 *  reads. The vendor's schema is closed (`additionalProperties: false`). */
export const zDatawebotSearchBody = z.strictObject({
    query: z.string().min(2).max(200).describe(
        "Keywords to search for, in any language.",
    ).optional(),
    site: z.string().min(2).max(253).describe(
        "The shop to search: a domain (amazon.com, walmart.com, " +
            "allbirds.com) or a shop name (allbirds).",
    ).optional(),
    country: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "Two-letter country code for the market. Picks the shop's domain " +
            "when `site` is a name.",
    ).optional(),
    limit: z.number().int().min(1).max(20).describe(
        "How many products to return, 1 to 20.",
    ).optional(),
    format: z.enum(["structured", "raw"]).describe(
        "`raw` adds the shop's own records where the shop has them.",
    ).optional(),
    max_credits: z.number().int().min(0).max(1_000_000).describe(
        "Budget in datawebot credits. If the price is higher, nothing " +
            "runs and nothing is charged.",
    ).optional(),
});
