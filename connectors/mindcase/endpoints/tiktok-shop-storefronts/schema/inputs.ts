import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `tiktok-shop/storefronts` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/tiktok-shop/storefronts). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zTiktokShopStorefrontsBody = z.object({
    storeUrls: z.array(z.string())
        .describe("One or more store urls. One request reads them all."),
    region: z.enum(["us", "gb", "mx", "my", "ph", "sg", "th", "vn", "jp", "id"])
        .describe("Region to use. United States by default.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many storefronts to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
