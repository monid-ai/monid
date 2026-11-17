import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `google-hotels/hotels` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/google-hotels/hotels). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zGoogleHotelsHotelsBody = z.object({
    location: z.string()
        .describe("Location."),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Check In Date as a date (YYYY-MM-DD). Format YYYY-MM-DD."),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Check Out Date as a date (YYYY-MM-DD). Format YYYY-MM-DD."),
    hotelClass: z.array(z.string())
        .describe("One or more hotel class. One request reads them all.")
        .optional(),
    sortBy: z.enum([
        "relevance",
        "price_low",
        "price_high",
        "rating",
        "most_reviewed",
        "distance",
    ])
        .describe("Sort By to use. Relevance by default.")
        .optional(),
    adults: z.number().int().min(1).max(9)
        .describe("Adults as a whole number.")
        .optional(),
    currency: z.string()
        .describe(
            "Three-letter currency code for prices, e.g. USD, EUR, GBP, INR. Defaults to USD.",
        )
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many hotels to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
