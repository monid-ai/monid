import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok-shop/reviews` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok-shop/reviews). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokShopReviewsBody = z.object({
    productUrls: z.array(z.string())
        .describe("One or more product urls. One request reads them all."),
    region: z.enum([
        "US",
        "GB",
        "DE",
        "FR",
        "IT",
        "ES",
        "IE",
        "BR",
        "MX",
        "JP",
        "ID",
        "MY",
        "PH",
        "SG",
        "TH",
        "VN",
    ])
        .describe("Region to use. United States by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many reviews to return in total. Defaults to 50; use 0 for all.",
        )
        .optional(),
    sort: z.enum([
        "recommended",
        "most_recent",
        "highest_rating",
        "lowest_rating",
    ])
        .describe("Sort to use.")
        .optional(),
}).strict();
