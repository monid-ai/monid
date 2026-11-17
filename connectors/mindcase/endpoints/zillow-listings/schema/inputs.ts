import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `zillow/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/zillow/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zZillowListingsBody = z.object({
    location: z.string()
        .describe("Location."),
    listingType: z.enum(["forSale", "forRent", "sold"])
        .describe("Listing Type to use. For sale by default.")
        .optional(),
    priceMin: z.number().int().min(0)
        .describe("Price Min as a whole number.")
        .optional(),
    priceMax: z.number().int().min(0)
        .describe("Price Max as a whole number.")
        .optional(),
    minBedrooms: z.number().int().min(0).max(20)
        .describe("Min Bedrooms as a whole number.")
        .optional(),
    homeTypes: z.array(
        z.enum([
            "house",
            "condo",
            "townhouse",
            "multiFamily",
            "apartment",
            "lot",
            "manufactured",
        ]),
    )
        .describe("Only these home types. Leave empty for all types.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many listings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
