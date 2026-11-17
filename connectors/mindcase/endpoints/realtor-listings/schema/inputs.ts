import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `realtor/listings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/realtor/listings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zRealtorListingsBody = z.object({
    location: z.string()
        .describe("Location."),
    listingType: z.enum(["BUY", "RENT", "SOLD"])
        .describe("Listing Type to use. Search for buy by default.")
        .optional(),
    priceMin: z.number().int().min(0)
        .describe("Price Min as a whole number.")
        .optional(),
    priceMax: z.number().int().min(0)
        .describe("Price Max as a whole number.")
        .optional(),
    minBedrooms: z.number().int().min(0)
        .describe("Min Bedrooms as a whole number.")
        .optional(),
    propertyTypes: z.array(
        z.enum([
            "single-family-home",
            "multi-family-home",
            "condo",
            "condop",
            "coop",
            "townhome",
            "apartments",
            "mfd-mobile-home",
            "farms-ranches",
            "land",
        ]),
    )
        .describe("Only these property types. Leave empty for all types.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many listings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
