import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `redfin/rentals` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/redfin/rentals). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zRedfinRentalsBody = z.object({
    location: z.string()
        .describe(
            "City, ZIP code or neighborhood to search, e.g. Denver, CO or 80211.",
        ),
    priceMin: z.number().int().min(0)
        .describe("Lowest monthly rent in dollars, e.g. 1500.")
        .optional(),
    priceMax: z.number().int().min(0)
        .describe("Highest monthly rent in dollars, e.g. 3000.")
        .optional(),
    minBedrooms: z.number().int().min(0).max(10)
        .describe("Minimum number of bedrooms, e.g. 2.")
        .optional(),
    homeTypes: z.array(z.enum(["apartment", "house", "condo", "townhouse"]))
        .describe("Only these home types. Leave empty for all types.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many rentals to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
