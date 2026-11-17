import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `redfin/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/redfin/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zRedfinListingsBody = z.object({
    location: z.string()
        .describe(
            "City, ZIP code or neighborhood to search, e.g. Austin, TX or 78704.",
        ),
    listingType: z.enum(["forSale", "sold"])
        .describe(
            "Which listings to return: homes for sale, or homes sold in the last 3 months. Defaults to for sale. For rentals use the Redfin Rentals API.",
        )
        .optional(),
    priceMin: z.number().int().min(0)
        .describe("Lowest price in dollars, e.g. 300000.")
        .optional(),
    priceMax: z.number().int().min(0)
        .describe("Highest price in dollars, e.g. 750000.")
        .optional(),
    minBedrooms: z.number().int().min(0).max(10)
        .describe("Minimum number of bedrooms, e.g. 3.")
        .optional(),
    homeTypes: z.array(
        z.enum([
            "house",
            "condo",
            "townhouse",
            "multifamily",
            "land",
            "manufactured",
            "co-op",
            "other",
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
