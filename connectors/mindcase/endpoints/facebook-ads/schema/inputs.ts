import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `facebook/ads` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/facebook/ads). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zFacebookAdsBody = z.object({
    urls: z.string()
        .describe(
            "The advertiser's Facebook page URL or handle (e.g. facebook.com/nike), or its Instagram profile URL (e.g. instagram.com/nike).",
        ),
    maxResults: z.number().int()
        .describe("Number of ads to return in total. Use 0 for all.")
        .optional(),
    activeStatus: z.enum(["active", "inactive"])
        .describe("Which ads to return.")
        .optional(),
    isDetailsPerAd: z.boolean()
        .describe(
            "Pull each ad's advertiser profile and EU transparency block. Keep on for the full record.",
        )
        .optional(),
}).strict();
